import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, money } from '../../common/http/serialize';
import {
  CreateUtilityBillDto,
  RecordUtilityPaymentDto,
  UpdateUtilityBillDto,
} from './dto/utility.dto';

function billStatus(
  stored: string,
  amount: Prisma.Decimal,
  paid: Prisma.Decimal,
  dueDate: Date,
): string {
  if (paid.greaterThanOrEqualTo(amount)) return 'paid';
  return dueDate.getTime() < Date.now() ? 'overdue' : 'unpaid';
}

@Injectable()
export class UtilitiesService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list(query: {
    page?: string;
    pageSize?: string;
    buildingId?: string;
    utilityType?: string;
    status?: string;
    periodFrom?: string;
    periodTo?: string;
  }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.UtilityBillWhereInput = {};
    if (query.buildingId) where.buildingId = query.buildingId;
    if (query.utilityType)
      where.utilityType = query.utilityType as Prisma.UtilityBillWhereInput['utilityType'];
    if (query.periodFrom || query.periodTo) {
      where.billingPeriod = {};
      if (query.periodFrom) where.billingPeriod.gte = query.periodFrom;
      if (query.periodTo) where.billingPeriod.lte = query.periodTo;
    }

    const [rows, total] = await Promise.all([
      this.prisma.utilityBill.findMany({
        where,
        orderBy: [{ billingPeriod: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          building: { select: { name: true } },
          payments: { select: { amountPaid: true } },
        },
      }),
      this.prisma.utilityBill.count({ where }),
    ]);

    let items = rows.map((b) => {
      const paid = b.payments.reduce(
        (a, p) => a.add(p.amountPaid),
        new Prisma.Decimal(0),
      );
      const consumption =
        b.currentReading != null && b.previousReading != null
          ? b.currentReading.sub(b.previousReading).toFixed(2)
          : null;
      return {
        id: b.id,
        buildingId: b.buildingId,
        buildingName: b.building.name,
        utilityType: b.utilityType,
        billingPeriod: b.billingPeriod,
        previousReading: money(b.previousReading),
        currentReading: money(b.currentReading),
        consumption,
        amount: money(b.amount),
        amountPaid: paid.toFixed(2),
        balance: b.amount.sub(paid).toFixed(2),
        dueDate: dateOnly(b.dueDate),
        status: billStatus(b.status, b.amount, paid, b.dueDate),
      };
    });
    if (query.status) items = items.filter((i) => i.status === query.status);

    return new Paginated(items, { page, pageSize, total });
  }

  async create(dto: CreateUtilityBillDto) {
    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
      select: { id: true },
    });
    if (!building) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Building not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    const amount = this.resolveAmount(dto);
    const bill = await this.prisma.utilityBill.create({
      data: {
        buildingId: dto.buildingId,
        utilityType: dto.utilityType,
        billingPeriod: dto.billingPeriod,
        previousReading: dto.previousReading ?? null,
        currentReading: dto.currentReading ?? null,
        ratePerUnit: dto.ratePerUnit ?? null,
        amount,
        dueDate: new Date(`${dto.dueDate}T00:00:00.000Z`),
        status: 'unpaid',
      },
    });
    return this.findOne(bill.id);
  }

  /**
   * The charge. If a current reading and a rate are given, it is computed as
   * (current − previous) × rate; otherwise the caller must supply `amount`.
   */
  private resolveAmount(dto: {
    previousReading?: string;
    currentReading?: string;
    ratePerUnit?: string;
    amount?: string;
  }): string {
    if (dto.currentReading != null && dto.ratePerUnit != null) {
      const prev = new Prisma.Decimal(dto.previousReading ?? '0');
      const curr = new Prisma.Decimal(dto.currentReading);
      if (curr.lessThan(prev)) {
        throw new AppException(
          ApiCode.VALIDATION_ERROR,
          'Current reading cannot be lower than the previous reading.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const consumption = curr.sub(prev);
      return consumption.mul(new Prisma.Decimal(dto.ratePerUnit)).toDecimalPlaces(2).toFixed(2);
    }
    if (dto.amount == null || dto.amount === '') {
      throw new AppException(
        ApiCode.VALIDATION_ERROR,
        'Provide either a meter reading with a rate, or an amount.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return dto.amount;
  }

  async findOne(id: string) {
    const b = await this.prisma.utilityBill.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!b) throw this.notFound();
    const paid = b.payments.reduce(
      (a, p) => a.add(p.amountPaid),
      new Prisma.Decimal(0),
    );
    const consumption =
      b.currentReading != null && b.previousReading != null
        ? b.currentReading.sub(b.previousReading).toFixed(2)
        : null;
    return {
      id: b.id,
      building: b.building,
      utilityType: b.utilityType,
      billingPeriod: b.billingPeriod,
      previousReading: money(b.previousReading),
      currentReading: money(b.currentReading),
      ratePerUnit: b.ratePerUnit != null ? b.ratePerUnit.toFixed(4) : null,
      consumption,
      amount: money(b.amount),
      amountPaid: paid.toFixed(2),
      balance: b.amount.sub(paid).toFixed(2),
      dueDate: dateOnly(b.dueDate),
      status: billStatus(b.status, b.amount, paid, b.dueDate),
      payments: b.payments.map((p) => ({
        id: p.id,
        amountPaid: money(p.amountPaid),
        paymentDate: dateOnly(p.paymentDate),
        voucherNumber: p.voucherNumber,
        orNumber: p.orNumber,
      })),
    };
  }

  async update(id: string, dto: UpdateUtilityBillDto) {
    await this.ensure(id);
    await this.prisma.utilityBill.update({
      where: { id },
      data: {
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(`${dto.dueDate}T00:00:00.000Z`) : undefined,
      },
    });
    return this.findOne(id);
  }

  async addPayment(id: string, dto: RecordUtilityPaymentDto, userId: string) {
    const bill = await this.prisma.utilityBill.findUnique({
      where: { id },
      include: { payments: { select: { amountPaid: true } } },
    });
    if (!bill) throw this.notFound();

    await this.prisma.utilityPayment.create({
      data: {
        utilityBillId: id,
        amountPaid: dto.amountPaid,
        paymentDate: new Date(`${dto.paymentDate}T00:00:00.000Z`),
        voucherNumber: dto.voucherNumber,
        orNumber: dto.orNumber,
        recordedById: userId,
      },
    });

    const paid = bill.payments
      .reduce((a, p) => a.add(p.amountPaid), new Prisma.Decimal(0))
      .add(dto.amountPaid);
    await this.prisma.utilityBill.update({
      where: { id },
      data: { status: paid.greaterThanOrEqualTo(bill.amount) ? 'paid' : 'unpaid' },
    });
    return this.findOne(id);
  }

  private async ensure(id: string): Promise<void> {
    const b = await this.prisma.utilityBill.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!b) throw this.notFound();
  }

  private notFound() {
    return new AppException(
      ApiCode.NOT_FOUND,
      'Utility bill not found.',
      HttpStatus.NOT_FOUND,
    );
  }
}
