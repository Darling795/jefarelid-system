import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES = 'roles';

/** Restricts a route to the given roles. Enforced server-side by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
