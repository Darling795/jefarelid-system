import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';

import { AppModule } from './app.module';
import { requestContext } from './common/audit/request-context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api (see API-CONTRACT.md base URL).
  app.setGlobalPrefix('api');

  // Allow the Next.js frontend to send credentialed (cookie) requests.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

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
        sameSite: 'lax',
        secure: false, // local development only
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    }),
  );

  // Establish the per-request audit context (acting user + IP) AFTER the
  // session middleware, so req.session.userId is populated. Everything
  // downstream (guards, services, Prisma writes) runs within this context.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    requestContext.run({ userId: req.session?.userId, ip: req.ip }, () => next());
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

void bootstrap();
