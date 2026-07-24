import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, money } from '../../common/http/serialize';
import { computeInvoiceForPeriod } from '../computation/computation';
import { SettingsService } from '../settings/settings.service';
import { daysInMonth, displayStatus, sumPaid } from './invoice.util';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: ExtendedPrismaClient,
    private readonly settings: SettingsService,
  ) {}

  async generate(periodMonth: string, contractId?: string) {
    const [year, month] = periodMonth.split('-').map(Number);
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));
    const rates = await this.settings.getRates();

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'active',
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
        ...(contractId ? { id: contractId } : {}),
      },
    });

    if (contractId && contracts.length === 0) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'No active contract found for that id and period.',
        HttpStatus.NOT_FOUND,
      );
    }

    const created: string[] = [];
    for (const c of contracts) {
      const amounts = computeInvoiceForPeriod({
        basicRent: c.basicRent.toString(),
        escalationRate: c.escalationRate.toString(),
        vatRate: rates.vatRate,
        whtRate: rates.whtRate,
        anchor: {
          year: c.escalationAnchorDate.getUTCFullYear(),
          month: c.escalationAnchorDate.getUTCMonth() + 1,
        },
        target: { year, month },
      });
      const due = Math.min(c.paymentDueDay, daysInMonth(year, month));
      const dueDate = new Date(Date.UTC(year, month - 1, due));

      try {
        const inv = await this.prisma.rentalInvoice.create({
          data: {
            contractId: c.id,
            periodMonth,
            basicRentApplied: amounts.effectiveBasicRent,
            vatAmount: amounts.vatAmount,
            grossRent: amounts.grossRent,
            whtAmount: amounts.whtAmount,
            netReceivable: amounts.netReceivable,
            dueDate,
            status: 'unpaid',
          },
        });
        created.push(inv.id);
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          if (contractId) {
            throw new AppException(
              ApiCode.INVOICE_ALREADY_EXISTS,
              'An invoice already exists for this contract and period.',
              HttpStatus.CONFLICT,
            );
          }
          continue; // bulk run: skip contracts already invoiced
        }
        throw e;
      }
    }

    const invoices = await this.prisma.rentalInvoice.findMany({
      where: { id: { in: created } },
      include: this.listInclude(),
    });
    return invoices.map((i) => this.toListItem(i));
  }

  async list(query: {
    page?: string;
    pageSize?: string;
    contractId?: string;
    tenantId?: string;
    buildingId?: string;
    status?: string;
    periodFrom?: string;
    periodTo?: string;
  }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.RentalInvoiceWhereInput = {};
    if (query.contractId) where.contractId = query.contractId;
    if (query.tenantId || query.buildingId) {
      const contractWhere: Prisma.ContractWhereInput = {};
      if (query.tenantId) contractWhere.tenantId = query.tenantId;
      if (query.buildingId) contractWhere.room = { buildingId: query.buildingId };
      where.contract = contractWhere;
    }
    if (query.status && query.status !== 'overdue')
      where.status = query.status as Prisma.RentalInvoiceWhereInput['status'];
    if (query.periodFrom || query.periodTo) {
      where.periodMonth = {};
      if (query.periodFrom) where.periodMonth.gte = query.periodFrom;
      if (query.periodTo) where.periodMonth.lte = query.periodTo;
    }

    const [rows, total] = await Promise.all([
      this.prisma.rentalInvoice.findMany({
        where,
        orderBy: [{ periodMonth: 'desc' }, { generatedAt: 'desc' }],
        skip,
        take,
        include: this.listInclude(),
      }),
      this.prisma.rentalInvoice.count({ where }),
    ]);

    let items = rows.map((i) => this.toListItem(i));
    if (query.status === 'overdue') items = items.filter((i) => i.status === 'overdue');

    return new Paginated(items, { page, pageSize, total });
  }

  async findOne(id: string) {
    const inv = await this.prisma.rentalInvoice.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true,
            tenant: { select: { id: true, businessName: true } },
            room: {
              select: { roomNumber: true, building: { select: { name: true } } },
            },
          },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!inv) throw this.notFound();

    const paid = sumPaid(inv.payments);
    const balance = inv.netReceivable.sub(paid);
    return {
      id: inv.id,
      contractId: inv.contractId,
      tenant: inv.contract.tenant,
      roomNumber: inv.contract.room.roomNumber,
      buildingName: inv.contract.room.building.name,
      periodMonth: inv.periodMonth,
      basicRentApplied: money(inv.basicRentApplied),
      vatAmount: money(inv.vatAmount),
      grossRent: money(inv.grossRent),
      whtAmount: money(inv.whtAmount),
      netReceivable: money(inv.netReceivable),
      amountPaid: paid.toFixed(2),
      balance: balance.toFixed(2),
      dueDate: dateOnly(inv.dueDate),
      status: displayStatus(inv.status, inv.netReceivable, paid, inv.dueDate),
      generatedAt: inv.generatedAt.toISOString(),
      payments: inv.payments.map((p) => ({
        id: p.id,
        amountPaid: money(p.amountPaid),
        paymentDate: dateOnly(p.paymentDate),
        orNumber: p.orNumber,
        paymentMethod: p.paymentMethod,
        remarks: p.remarks,
      })),
    };
  }

  async void(id: string, _reason: string) {
    const inv = await this.prisma.rentalInvoice.findUnique({
      where: { id },
      include: { payments: { select: { id: true } } },
    });
    if (!inv) throw this.notFound();
    if (inv.payments.length > 0) {
      throw new AppException(
        ApiCode.CONFLICT,
        'Cannot void an invoice that has payments.',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.rentalInvoice.update({ where: { id }, data: { status: 'voided' } });
    return this.findOne(id);
  }

  private listInclude() {
    return {
      contract: {
        select: {
          tenant: { select: { businessName: true } },
          room: { select: { roomNumber: true, building: { select: { name: true } } } },
        },
      },
      payments: { select: { amountPaid: true } },
    } satisfies Prisma.RentalInvoiceInclude;
  }

  private toListItem(
    inv: Prisma.RentalInvoiceGetPayload<{ include: ReturnType<InvoicesService['listInclude']> }>,
  ) {
    const paid = sumPaid(inv.payments);
    return {
      id: inv.id,
      contractId: inv.contractId,
      tenantName: inv.contract.tenant.businessName,
      roomNumber: inv.contract.room.roomNumber,
      buildingName: inv.contract.room.building.name,
      periodMonth: inv.periodMonth,
      netReceivable: money(inv.netReceivable),
      amountPaid: paid.toFixed(2),
      balance: inv.netReceivable.sub(paid).toFixed(2),
      dueDate: dateOnly(inv.dueDate),
      status: displayStatus(inv.status, inv.netReceivable, paid, inv.dueDate),
    };
  }

  private notFound() {
    return new AppException(
      ApiCode.NOT_FOUND,
      'Invoice not found.',
      HttpStatus.NOT_FOUND,
    );
  }
}
