import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { iso } from '../../common/http/serialize';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { name: 'asc' } });
    return users.map((u) => this.view(u));
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const u = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: dto.role,
        },
      });
      return this.view(u);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(
          ApiCode.CONFLICT,
          'A user with that email already exists.',
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensure(id);
    const u = await this.prisma.user.update({
      where: { id },
      data: { name: dto.name, isActive: dto.isActive },
    });
    return this.view(u);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.ensure(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
  }

  async unlock(id: string): Promise<void> {
    await this.ensure(id);
    await this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  private view(u: User) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: iso(u.lastLoginAt),
      lockedUntil: iso(u.lockedUntil),
    };
  }

  private async ensure(id: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!u) {
      throw new AppException(ApiCode.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
  }
}
