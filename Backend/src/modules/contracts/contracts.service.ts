import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Contract, Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, money, rate } from '../../common/http/serialize';
import { escalate, escalationPeriods } from '../computation/computation';
import {
  CreateContractDto,
  RenewContractDto,
  TerminateContractDto,
  UpdateContractDto,
} from './dto/contract.dto';

const DAY = 86_400_000;
const EXPIRING_DAYS = 90;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Derived status: an active contract within 90 days of expiry shows "expiring". */
function effectiveStatus(status: string, endDate: Date): string {
  if (status === 'active') {
    const days = (endDate.getTime() - Date.now()) / DAY;
    if (days >= 0 && days <= EXPIRING_DAYS) return 'expiring';
  }
  return status;
}

@Injectable()
export class ContractsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list(query: {
    page?: string;
    pageSize?: string;
    status?: string;
    buildingId?: string;
    tenantId?: string;
    expiringWithinDays?: string;
  }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.ContractWhereInput = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.buildingId) where.room = { buildingId: query.buildingId };

    if (query.status === 'expiring') {
      where.status = 'active';
      where.endDate = { gte: new Date(), lte: new Date(Date.now() + EXPIRING_DAYS * DAY) };
    } else if (query.status) {
      where.status = query.status as Prisma.EnumContractStatusFilter['equals'];
    }
    if (query.expiringWithinDays) {
      where.status = 'active';
      where.endDate = {
        gte: new Date(),
        lte: new Date(Date.now() + Number(query.expiringWithinDays) * DAY),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take,
        include: {
          tenant: { select: { id: true, businessName: true } },
          room: {
            select: { id: true, roomNumber: true, building: { select: { name: true } } },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return new Paginated(
      rows.map((c) => ({
        id: c.id,
        tenant: c.tenant,
        roomNumber: c.room.roomNumber,
        buildingName: c.room.building.name,
        startDate: dateOnly(c.startDate),
        endDate: dateOnly(c.endDate),
        basicRent: money(c.basicRent),
        status: effectiveStatus(c.status, c.endDate),
        rawStatus: c.status,
      })),
      { page, pageSize, total },
    );
  }

  async archive() {
    const rows = await this.prisma.contract.findMany({
      where: { status: { in: ['expired', 'terminated'] } },
      orderBy: { endDate: 'desc' },
      include: {
        tenant: { select: { id: true, businessName: true } },
        room: { select: { roomNumber: true, building: { select: { name: true } } } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      tenant: c.tenant,
      roomNumber: c.room.roomNumber,
      buildingName: c.room.building.name,
      startDate: dateOnly(c.startDate),
      endDate: dateOnly(c.endDate),
      status: c.status,
      terminationDate: dateOnly(c.terminationDate),
      terminationReason: c.terminationReason,
    }));
  }

  async create(dto: CreateContractDto) {
    const start = toDate(dto.startDate);
    const end = toDate(dto.endDate);
    if (end <= start) {
      throw new AppException(
        ApiCode.INVALID_DATE_RANGE,
        'End date must be after start date.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw this.notFound('Tenant');
    if (tenant.status !== 'active') {
      throw new AppException(
        ApiCode.TENANT_INACTIVE,
        'Tenant is inactive.',
        HttpStatus.CONFLICT,
      );
    }

    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw this.notFound('Room');
    if (!room.isActive) {
      throw new AppException(
        ApiCode.ROOM_INACTIVE,
        'Room is inactive.',
        HttpStatus.CONFLICT,
      );
    }

    await this.assertNoOverlap(dto.roomId, start, end);

    let escalationRate = dto.escalationRate;
    if (!escalationRate) {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'default_escalation_rate' },
      });
      escalationRate = setting?.value ?? '0.05';
    }

    const contract = await this.prisma.contract.create({
      data: {
        tenantId: dto.tenantId,
        roomId: dto.roomId,
        startDate: start,
        endDate: end,
        basicRent: dto.basicRent,
        escalationRate,
        escalationAnchorDate: dto.escalationAnchorDate
          ? toDate(dto.escalationAnchorDate)
          : start,
        securityDeposit: dto.securityDeposit,
        advancePayment: dto.advancePayment,
        paymentDueDay: dto.paymentDueDay,
        status: 'draft',
      },
    });
    return this.findOne(contract.id);
  }

  async findOne(id: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, businessName: true } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: { select: { id: true, name: true } },
          },
        },
        invoices: { orderBy: { periodMonth: 'desc' } },
        parentContract: { select: { id: true } },
      },
    });
    if (!c) throw this.notFound('Contract');

    return {
      id: c.id,
      tenant: c.tenant,
      room: { id: c.room.id, roomNumber: c.room.roomNumber, building: c.room.building },
      startDate: dateOnly(c.startDate),
      endDate: dateOnly(c.endDate),
      basicRent: money(c.basicRent),
      escalationRate: rate(c.escalationRate),
      escalationAnchorDate: dateOnly(c.escalationAnchorDate),
      securityDeposit: money(c.securityDeposit),
      advancePayment: money(c.advancePayment),
      paymentDueDay: c.paymentDueDay,
      status: effectiveStatus(c.status, c.endDate),
      rawStatus: c.status,
      parentContractId: c.parentContractId,
      terminationDate: dateOnly(c.terminationDate),
      terminationReason: c.terminationReason,
      invoices: c.invoices.map((inv) => ({
        id: inv.id,
        periodMonth: inv.periodMonth,
        netReceivable: money(inv.netReceivable),
        dueDate: dateOnly(inv.dueDate),
        status: inv.status,
      })),
    };
  }

  async update(id: string, dto: UpdateContractDto) {
    const c = await this.getRaw(id);
    if (c.status !== 'draft') {
      throw new AppException(
        ApiCode.INVALID_CONTRACT_STATE,
        'Only draft contracts can be edited.',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.contract.update({
      where: { id },
      data: {
        endDate: dto.endDate ? toDate(dto.endDate) : undefined,
        basicRent: dto.basicRent,
        escalationRate: dto.escalationRate,
        securityDeposit: dto.securityDeposit,
        advancePayment: dto.advancePayment,
        paymentDueDay: dto.paymentDueDay,
      },
    });
    return this.findOne(id);
  }

  async activate(id: string) {
    const c = await this.getRaw(id);
    if (c.status !== 'draft') {
      throw new AppException(
        ApiCode.INVALID_CONTRACT_STATE,
        'Only draft contracts can be activated.',
        HttpStatus.CONFLICT,
      );
    }
    await this.assertNoOverlap(c.roomId, c.startDate, c.endDate, c.id);
    await this.prisma.contract.update({ where: { id }, data: { status: 'active' } });
    await this.prisma.room.update({
      where: { id: c.roomId },
      data: { status: 'occupied' },
    });
    return this.findOne(id);
  }

  async renew(id: string, dto: RenewContractDto) {
    const c = await this.getRaw(id);
    if (c.status !== 'active' && c.status !== 'expiring') {
      throw new AppException(
        ApiCode.INVALID_CONTRACT_STATE,
        'Only an active contract can be renewed.',
        HttpStatus.CONFLICT,
      );
    }
    const start = toDate(dto.startDate);
    const end = toDate(dto.endDate);
    if (end <= start) {
      throw new AppException(
        ApiCode.INVALID_DATE_RANGE,
        'End date must be after start date.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Carry forward the escalated rent as the new basic rent (SPEC 6.6).
    const periods = escalationPeriods(
      { year: c.escalationAnchorDate.getUTCFullYear(), month: c.escalationAnchorDate.getUTCMonth() + 1 },
      { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 },
    );
    const carried = escalate(c.basicRent.toString(), c.escalationRate.toString(), periods);
    const newBasicRent = dto.basicRent ?? carried.toFixed(2);

    const renewal = await this.prisma.contract.create({
      data: {
        tenantId: c.tenantId,
        roomId: c.roomId,
        startDate: start,
        endDate: end,
        basicRent: newBasicRent,
        escalationRate: dto.escalationRate ?? c.escalationRate,
        escalationAnchorDate: start,
        securityDeposit: c.securityDeposit,
        advancePayment: c.advancePayment,
        paymentDueDay: c.paymentDueDay,
        status: 'active',
        parentContractId: c.id,
      },
    });
    await this.prisma.contract.update({ where: { id: c.id }, data: { status: 'renewed' } });
    await this.prisma.room.update({ where: { id: c.roomId }, data: { status: 'occupied' } });

    return this.findOne(renewal.id);
  }

  async terminate(id: string, dto: TerminateContractDto) {
    const c = await this.getRaw(id);
    if (c.status !== 'active' && c.status !== 'expiring') {
      throw new AppException(
        ApiCode.INVALID_CONTRACT_STATE,
        'Only an active contract can be terminated.',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.contract.update({
      where: { id },
      data: {
        status: 'terminated',
        terminationDate: toDate(dto.effectiveDate),
        terminationReason: dto.reason,
      },
    });
    // TODO: confirm with client — security deposit refund/forfeiture rules on
    // termination (SPEC §9). Deposit settlement is recorded manually for now.
    await this.prisma.room.update({ where: { id: c.roomId }, data: { status: 'vacant' } });
    return this.findOne(id);
  }

  private async assertNoOverlap(
    roomId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.contract.findFirst({
      where: {
        roomId,
        status: 'active',
        startDate: { lte: end },
        endDate: { gte: start },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new AppException(
        ApiCode.CONTRACT_OVERLAP,
        'Room already has an active contract for this period.',
        HttpStatus.CONFLICT,
        { conflictingContractId: conflict.id },
      );
    }
  }

  private async getRaw(id: string): Promise<Contract> {
    const c = await this.prisma.contract.findUnique({ where: { id } });
    if (!c) throw this.notFound('Contract');
    return c;
  }

  private notFound(entity: string) {
    return new AppException(
      ApiCode.NOT_FOUND,
      `${entity} not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}
