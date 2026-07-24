import { PrismaClient } from '@prisma/client';

import { createAuditExtension } from '../audit/audit.extension';

/** DI token for the audited (extended) Prisma client. */
export const PRISMA = Symbol('PRISMA_AUDITED');

/** Applies the audit extension to a base client. */
export function applyAudit(base: PrismaClient) {
  return base.$extends(createAuditExtension(base));
}

/** Type of the audited client — inject with `@Inject(PRISMA)`. */
export type ExtendedPrismaClient = ReturnType<typeof applyAudit>;
