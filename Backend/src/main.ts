import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';

import { AppModule } from './app.module';
import { requestContext } from './common/audit/request-context';

// Express reports loopback requests as the IPv6 forms "::1" or
// "::ffff:127.0.0.1", which are meaningless in the audit trail. Present a
// plain IPv4 address instead.
function clientIp(req: Request): string | undefined {
  let ip = req.ip;
  if (!ip) return undefined;
  if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // All routes are served under /api (see API-CONTRACT.md base URL).
  app.setGlobalPrefix('api');

  // Behind a reverse proxy (Railway/Render/any HTTPS host) so Express trusts
  // X-Forwarded-* and marks the connection secure — required for secure cookies.
  // Harmless locally (no proxy present).
  app.set('trust proxy', 1);

  // Allow the Next.js frontend to send credentialed (cookie) requests. In
  // production CORS_ORIGIN must be the exact frontend URL (no trailing slash).
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // When the frontend and backend are on different HTTPS domains (e.g. two
  // Railway services), the session cookie must be Secure + SameSite=None or the
  // browser drops it. Set COOKIE_SECURE=true in that deployment. Locally it
  // stays lax/insecure so http://localhost works.
  const cookieSecure = process.env.COOKIE_SECURE === 'true';

  // Session-based auth, stored in Postgres (SPEC section 4).
  const PgStore = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: false }),
      secret: process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me',
      resave: false,
      saveUninitialized: false,
      rolling: true, // reset the 8h window on activity → expires after inactivity
      cookie: {
        httpOnly: true,
        sameSite: cookieSecure ? 'none' : 'lax',
        secure: cookieSecure,
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    }),
  );

  // Establish the per-request audit context (acting user + IP) AFTER the
  // session middleware, so req.session.userId is populated. Everything
  // downstream (guards, services, Prisma writes) runs within this context.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    requestContext.run({ userId: req.session?.userId, ip: clientIp(req) }, () => next());
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Bind to 0.0.0.0 so the container's platform router can reach it.
  const port = process.env.PORT ?? 3001;
  await app.listen(Number(port), '0.0.0.0');
}

void bootstrap();
