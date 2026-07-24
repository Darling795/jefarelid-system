import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { ApiCode } from '../http/api-codes';
import { AppException } from '../http/app-exception';
import { ROLES } from './roles.decorator';

/**
 * Enforces @Roles(...) server-side. Runs after SessionGuard, so req.currentUser
 * is present. A request that bypasses the UI still gets 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.currentUser;
    if (!user || !required.includes(user.role)) {
      throw new AppException(
        ApiCode.FORBIDDEN,
        'You do not have permission to perform this action.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
