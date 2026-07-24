import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Session, SessionData } from 'express-session';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  lastLoginAt: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA) private readonly prisma: ExtendedPrismaClient,
  ) {}

  async login(
    email: string,
    password: string,
    session: Session & Partial<SessionData>,
  ): Promise<UserView> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new AppException(
        ApiCode.INVALID_CREDENTIALS,
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.isActive) {
      throw new AppException(
        ApiCode.ACCOUNT_INACTIVE,
        'This account is inactive.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppException(
        ApiCode.ACCOUNT_LOCKED,
        'Account is temporarily locked due to failed login attempts.',
        HttpStatus.FORBIDDEN,
        { lockedUntil: user.lockedUntil.toISOString() },
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const locked = failed >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: locked ? 0 : failed,
          lockedUntil: locked
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : user.lockedUntil,
        },
      });
      throw new AppException(
        ApiCode.INVALID_CREDENTIALS,
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    session.userId = updated.id;
    return this.toView(updated);
  }

  async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppException(
        ApiCode.INVALID_CURRENT_PASSWORD,
        'Current password is incorrect.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  toView(user: User): UserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }
}
