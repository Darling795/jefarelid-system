import 'express-session';
import type { User } from '@prisma/client';

// Augment express-session with our session payload.
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Attach the resolved user to the request (set by SessionGuard).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

export {};
