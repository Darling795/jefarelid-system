import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  userId?: string;
  ip?: string;
}

/**
 * Per-request context carrying the acting user + IP. Established as an Express
 * middleware right after the session middleware (see main.ts), so it is
 * available to the Prisma audit middleware for every request-driven write.
 */
export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestStore(): RequestStore | undefined {
  return requestContext.getStore();
}
