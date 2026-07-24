import { Prisma, PrismaClient } from '@prisma/client';

import { getRequestStore } from './request-context';

const WRITE_OPS = new Set(['create', 'update', 'delete', 'upsert']);

/**
 * Prisma Client extension that writes an audit_logs row for every
 * request-driven create/update/delete. Because auditing lives here, a new
 * endpoint is audited by default — no per-service calls (CLAUDE.md).
 *
 * `base` is the non-extended client, used for the before-state lookup and the
 * audit write so those do not re-enter the extension. Writes outside an HTTP
 * request (seed, cron) have no request context and are not audited.
 */
export function createAuditExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            model === 'AuditLog' ||
            !WRITE_OPS.has(operation) ||
            !getRequestStore()?.userId
          ) {
            return query(args);
          }

          const store = getRequestStore()!;
          const accessor = model.charAt(0).toLowerCase() + model.slice(1);
          const where = (args as { where?: Record<string, unknown> })?.where;

          let before: Record<string, unknown> | null = null;
          if (
            (operation === 'update' ||
              operation === 'delete' ||
              operation === 'upsert') &&
            where
          ) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              before = await (base as any)[accessor].findUnique({ where });
            } catch {
              before = null;
            }
          }

          const result = await query(args);

          let auditAction: 'create' | 'update' | 'delete';
          if (operation === 'create') auditAction = 'create';
          else if (operation === 'delete') auditAction = 'delete';
          else if (operation === 'upsert') auditAction = before ? 'update' : 'create';
          else auditAction = 'update';

          const after =
            auditAction === 'delete'
              ? null
              : (result as Record<string, unknown> | null);
          const entityId =
            (after?.id as string | undefined) ??
            (before?.id as string | undefined) ??
            'unknown';

          try {
            await base.auditLog.create({
              data: {
                userId: store.userId,
                action: auditAction,
                entityType: model,
                entityId: String(entityId),
                beforeJson: toJson(before),
                afterJson: toJson(after),
                ipAddress: store.ip ?? null,
              },
            });
          } catch {
            // Auditing must never break the underlying write.
          }

          return result;
        },
      },
    },
  });
}

function toJson(
  record: Record<string, unknown> | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!record) return Prisma.DbNull;
  const obj = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  if ('passwordHash' in obj) obj.passwordHash = '[redacted]';
  return obj as Prisma.InputJsonValue;
}
