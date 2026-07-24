import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { ApiCode } from '../http/api-codes';
import { AppException } from '../http/app-exception';
import { IS_PUBLIC } from './public.decorator';

/**
 * Requires a valid session for every route except those marked @Public().
 * Loads the user fresh each request so role/active changes take effect
 * immediately, and attaches it as req.currentUser.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const userId = req.session?.userId;
    if (!userId) {
      throw new AppException(
        ApiCode.UNAUTHENTICATED,
        'Authentication required.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      req.session.destroy(() => undefined);
      throw new AppException(
        ApiCode.UNAUTHENTICATED,
        'Session is no longer valid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    req.currentUser = user;
    return true;
  }
}
