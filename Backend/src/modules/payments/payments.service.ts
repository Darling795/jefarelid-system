import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, money } from '../../common/http/serialize';
import { sumPaid } from '../invoices/invoice.util';
import { CreatePaymentDto } from './dto/payment.dto';

const DAY = 86_400_000;

@Injectable()
export class PaymentsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async create(dto: CreatePaymentDto, userId: string) {
    const invoice = await this.prisma.rentalInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Invoice not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status === 'voided') {
      throw new AppException(
        ApiCode.INVOICE_VOIDED,
        'Cannot record a payment against a voided invoice.',
        HttpStatus.CONFLICT,
      );
    }

    if (dto.orNumber) {
      const dup = await this.prisma.rentalPayment.findFirst({
        where: { orNumber: dto.orNumber },
        select: { id: true },
      });
      if (dup) {
        throw new AppException(
          ApiCode.DUPLICATE_OR_NUMBER,
          'That OR number has already been recorded.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const paid = sumPaid(invoice.payments);
    const balance = invoice.netReceivable.sub(paid);
    const amount = new Prisma.Decimal(dto.amountPaid);
    if (amount.greaterThan(balance)) {
      throw new AppException(
        ApiCode.OVERPAYMENT,
        'Payment exceeds the outstanding balance.',
        HttpStatus.CONFLICT,
        { balance: balance.toFixed(2) },
      );
    }

    const payment = await this.prisma.rentalPayment.create({
      data: {
        invoiceId: dto.invoiceId,
        amountPaid: dto.amountPaid,
        paymentDate: new Date(`${dto.paymentDate}T00:00:00.000Z`),
        orNumber: dto.orNumber,
        paymentMethod: dto.paymentMethod,
        remarks: dto.remarks,
        recordedById: userId,
      },
    });

    await this.refreshInvoiceStatus(dto.invoiceId);
    return this.findOne(payment.id);
  }

  async list(query: {
    page?: string;
    pageSize?: string;
    tenantId?: string;
    buildingId?: string;
    periodMonth?: string;
    orNumber?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.RentalPaymentWhereInput = {};

    // Tenant, building and billing period all constrain the payment's invoice.
    const contractWhere: Prisma.ContractWhereInput = {};
    if (query.tenantId) contractWhere.tenantId = query.tenantId;
    if (query.buildingId) contractWhere.room = { buildingId: query.buildingId };
    const invoiceWhere: Prisma.RentalInvoiceWhereInput = {};
    if (query.periodMonth) invoiceWhere.periodMonth = query.periodMonth;
    if (Object.keys(contractWhere).length) invoiceWhere.contract = contractWhere;
    if (Object.keys(invoiceWhere).length) where.invoice = invoiceWhere;

    if (query.orNumber) {
      where.orNumber = { contains: query.orNumber, mode: 'insensitive' };
    }
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {};
      if (query.dateFrom) where.paymentDate.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) where.paymentDate.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }

    const [rows, total] = await Promise.all([
      this.prisma.rentalPayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take,
        include: {
          invoice: {
            select: {
              periodMonth: true,
              contract: { select: { tenant: { select: { businessName: true } } } },
            },
          },
        },
      }),
      this.prisma.rentalPayment.count({ where }),
    ]);

    return new Paginated(
      rows.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        tenantName: p.invoice.contract.tenant.businessName,
        periodMonth: p.invoice.periodMonth,
        amountPaid: money(p.amountPaid),
        paymentDate: dateOnly(p.paymentDate),
        orNumber: p.orNumber,
        paymentMethod: p.paymentMethod,
      })),
      { page, pageSize, total },
    );
  }

  async findOne(id: string) {
    const p = await this.prisma.rentalPayment.findUnique({
      where: { id },
      include: {
        invoice: { select: { id: true, periodMonth: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });
    if (!p) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Payment not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: p.id,
      invoiceId: p.invoiceId,
      periodMonth: p.invoice.periodMonth,
      amountPaid: money(p.amountPaid),
      paymentDate: dateOnly(p.paymentDate),
      orNumber: p.orNumber,
      paymentMethod: p.paymentMethod,
      remarks: p.remarks,
      recordedBy: p.recordedBy,
    };
  }

  async remove(id: string, _reason: string): Promise<void> {
    const p = await this.prisma.rentalPayment.findUnique({ where: { id } });
    if (!p) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Payment not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.rentalPayment.delete({ where: { id } });
    await this.refreshInvoiceStatus(p.invoiceId);
  }

  async outstanding(query: { tenantId?: string; buildingId?: string }) {
    const where: Prisma.RentalInvoiceWhereInput = {
      status: { notIn: ['paid', 'voided'] },
    };
    if (query.tenantId || query.buildingId) {
      const contractWhere: Prisma.ContractWhereInput = {};
      if (query.tenantId) contractWhere.tenantId = query.tenantId;
      if (query.buildingId) contractWhere.room = { buildingId: query.buildingId };
      where.contract = contractWhere;
    }

    const invoices = await this.prisma.rentalInvoice.findMany({
      where,
      select: {
        netReceivable: true,
        dueDate: true,
        payments: { select: { amountPaid: true } },
      },
    });

    const buckets = {
      current: new Prisma.Decimal(0),
      days30: new Prisma.Decimal(0),
      days60: new Prisma.Decimal(0),
      days90Plus: new Prisma.Decimal(0),
    };

    for (const inv of invoices) {
      const balance = inv.netReceivable.sub(sumPaid(inv.payments));
      if (balance.lessThanOrEqualTo(0)) continue;
      const overdueDays = Math.floor((Date.now() - inv.dueDate.getTime()) / DAY);
      if (overdueDays <= 0) buckets.current = buckets.current.add(balance);
      else if (overdueDays <= 30) buckets.days30 = buckets.days30.add(balance);
      else if (overdueDays <= 60) buckets.days60 = buckets.days60.add(balance);
      else buckets.days90Plus = buckets.days90Plus.add(balance);
    }

    const total = buckets.current
      .add(buckets.days30)
      .add(buckets.days60)
      .add(buckets.days90Plus);

    return {
      current: buckets.current.toFixed(2),
      days30: buckets.days30.toFixed(2),
      days60: buckets.days60.toFixed(2),
      days90Plus: buckets.days90Plus.toFixed(2),
      total: total.toFixed(2),
    };
  }

  /** Recompute stored invoice status after payments change. */
  private async refreshInvoiceStatus(invoiceId: string): Promise<void> {
    const inv = await this.prisma.rentalInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { select: { amountPaid: true } } },
    });
    if (!inv || inv.status === 'voided') return;
    const paid = sumPaid(inv.payments);
    const balance = inv.netReceivable.sub(paid);
    const status = balance.lessThanOrEqualTo(0)
      ? 'paid'
      : paid.greaterThan(0)
        ? 'partial'
        : 'unpaid';
    await this.prisma.rentalInvoice.update({ where: { id: invoiceId }, data: { status } });
  }
}
