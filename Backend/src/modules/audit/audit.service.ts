import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: Prisma.AuditLogWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return new Paginated(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        user: r.user,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      })),
      { page, pageSize, total },
    );
  }

  async getOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!log) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Audit log not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      beforeJson: log.beforeJson,
      afterJson: log.afterJson,
    };
  }
}
