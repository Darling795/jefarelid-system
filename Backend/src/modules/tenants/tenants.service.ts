import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, iso, money } from '../../common/http/serialize';
import {
  ApplyCreditDto,
  CreateTenantDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

/** Today as YYYY-MM-DD (UTC) — default date for a credit application. */
function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class TenantsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list(query: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.TenantWhereInput = {};
    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { tin: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'active' || query.status === 'inactive') {
      where.status = query.status;
    }

    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { businessName: 'asc' },
        skip,
        take,
        include: {
          _count: { select: { contracts: { where: { status: 'active' } } } },
          // The tenant's current lease(s): building + the full room set, so the
          // list can show which building/room each tenant occupies (item 6) and
          // link straight to the contract (item 5).
          contracts: {
            where: { status: 'active' },
            orderBy: { startDate: 'desc' },
            include: {
              room: { select: { building: { select: { name: true } } } },
              rooms: { include: { room: { select: { roomNumber: true } } } },
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return new Paginated(
      rows.map((t) => ({
        id: t.id,
        businessName: t.businessName,
        contactPerson: t.contactPerson,
        contactNumber: t.contactNumber,
        email: t.email,
        tin: t.tin,
        status: t.status,
        activeContracts: t._count.contracts,
        activeLeases: t.contracts.map((c) => ({
          contractId: c.id,
          buildingName: c.room.building.name,
          roomNumbers: c.rooms.map((r) => r.room.roomNumber),
        })),
      })),
      { page, pageSize, total },
    );
  }

  async create(dto: CreateTenantDto) {
    const t = await this.prisma.tenant.create({ data: { ...dto } });
    return this.findOne(t.id);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            room: { include: { building: { select: { name: true } } } },
          },
        },
      },
    });
    if (!tenant) throw this.notFound();

    const outstandingBalance = await this.outstandingFor(id);

    return {
      id: tenant.id,
      businessName: tenant.businessName,
      contactPerson: tenant.contactPerson,
      contactNumber: tenant.contactNumber,
      email: tenant.email,
      tin: tenant.tin,
      address: tenant.address,
      notes: tenant.notes,
      status: tenant.status,
      outstandingBalance,
      contracts: tenant.contracts.map((c) => ({
        id: c.id,
        roomNumber: c.room.roomNumber,
        buildingName: c.room.building.name,
        startDate: dateOnly(c.startDate),
        endDate: dateOnly(c.endDate),
        basicRent: money(c.basicRent),
        status: c.status,
      })),
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.ensureExists(id);
    await this.prisma.tenant.update({ where: { id }, data: { ...dto } });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { contracts: { select: { id: true, status: true } } },
    });
    if (!tenant) throw this.notFound();

    if (tenant.contracts.some((c) => c.status === 'active')) {
      throw new AppException(
        ApiCode.TENANT_HAS_ACTIVE_CONTRACT,
        'Cannot remove a tenant with an active contract.',
        HttpStatus.CONFLICT,
      );
    }

    // "History worth keeping" means real financial records — invoices. A tenant
    // whose contracts never billed anything (or who has no contracts at all,
    // e.g. leftover test data) is removed outright, clearing those empty
    // contracts first for the FK. A tenant that did bill is kept for the record
    // and only marked inactive.
    const contractIds = tenant.contracts.map((c) => c.id);
    const invoiceCount = contractIds.length
      ? await this.prisma.rentalInvoice.count({
          where: { contractId: { in: contractIds } },
        })
      : 0;

    if (invoiceCount > 0) {
      await this.prisma.tenant.update({
        where: { id },
        data: { status: 'inactive' },
      });
      return;
    }

    if (contractIds.length) {
      await this.prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
    }
    await this.prisma.tenant.delete({ where: { id } });
  }

  async payments(id: string) {
    await this.ensureExists(id);
    const payments = await this.prisma.rentalPayment.findMany({
      where: { invoice: { contract: { tenantId: id } } },
      orderBy: { paymentDate: 'desc' },
      include: { invoice: { select: { id: true, periodMonth: true } } },
    });
    return payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      periodMonth: p.invoice.periodMonth,
      amountPaid: money(p.amountPaid),
      paymentDate: dateOnly(p.paymentDate),
      orNumber: p.orNumber,
      paymentMethod: p.paymentMethod,
      remarks: p.remarks,
    }));
  }

  /**
   * A tenant's advance credits (SPEC panel 5.2): the full list plus the total
   * unapplied balance. Credits arise when a payment exceeds an invoice balance.
   */
  async credits(tenantId: string) {
    await this.ensureExists(tenantId);
    const credits = await this.prisma.tenantCredit.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const totalRemaining = credits.reduce(
      (acc, c) => acc.add(c.remaining),
      new Prisma.Decimal(0),
    );
    return {
      totalRemaining: totalRemaining.toFixed(2),
      credits: credits.map((c) => ({
        id: c.id,
        amount: money(c.amount),
        remaining: money(c.remaining),
        sourceInvoiceId: c.sourceInvoiceId,
        note: c.note,
        createdAt: iso(c.createdAt),
      })),
    };
  }

  /**
   * Apply a tenant's advance credit to one of their invoices (owner policy:
   * manual, never automatic). Draws down credits oldest-first, records a
   * credit-funded payment on the invoice, and refreshes its status. The cash is
   * not double counted — the credit originated as excess that was never applied
   * to an invoice; applying it here is its first and only application.
   */
  async applyCredit(tenantId: string, dto: ApplyCreditDto, userId: string) {
    await this.ensureExists(tenantId);
    const invoice = await this.prisma.rentalInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        contract: { select: { tenantId: true } },
        payments: { select: { amountPaid: true } },
      },
    });
    if (!invoice || invoice.contract.tenantId !== tenantId) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Invoice not found for this tenant.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status === 'voided') {
      throw new AppException(
        ApiCode.INVOICE_VOIDED,
        'Cannot apply credit to a voided invoice.',
        HttpStatus.CONFLICT,
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new AppException(
        ApiCode.VALIDATION_ERROR,
        'Amount must be greater than zero.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const paid = invoice.payments.reduce(
      (acc, p) => acc.add(p.amountPaid),
      new Prisma.Decimal(0),
    );
    const balance = invoice.netReceivable.sub(paid);
    if (amount.greaterThan(balance)) {
      throw new AppException(
        ApiCode.OVERPAYMENT,
        'Credit applied exceeds the invoice balance.',
        HttpStatus.CONFLICT,
        { balance: balance.toFixed(2) },
      );
    }

    const credits = await this.prisma.tenantCredit.findMany({
      where: { tenantId, remaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });
    const available = credits.reduce(
      (acc, c) => acc.add(c.remaining),
      new Prisma.Decimal(0),
    );
    if (amount.greaterThan(available)) {
      throw new AppException(
        ApiCode.INSUFFICIENT_CREDIT,
        'Not enough advance credit available.',
        HttpStatus.CONFLICT,
        { available: available.toFixed(2) },
      );
    }

    // Draw down credits oldest-first.
    let toDraw = amount;
    for (const c of credits) {
      if (toDraw.lessThanOrEqualTo(0)) break;
      const take = c.remaining.greaterThan(toDraw) ? toDraw : c.remaining;
      await this.prisma.tenantCredit.update({
        where: { id: c.id },
        data: { remaining: c.remaining.sub(take) },
      });
      toDraw = toDraw.sub(take);
    }

    // Record the credit-funded payment (method flags it so cash reports can
    // exclude it — it is not new cash).
    await this.prisma.rentalPayment.create({
      data: {
        invoiceId: invoice.id,
        amountPaid: amount.toFixed(2),
        paymentDate: new Date(`${dto.paymentDate ?? isoDateToday()}T00:00:00.000Z`),
        paymentMethod: 'advance_credit',
        remarks: 'Applied from advance credit',
        recordedById: userId,
      },
    });

    const newPaid = paid.add(amount);
    const newBalance = invoice.netReceivable.sub(newPaid);
    const status = newBalance.lessThanOrEqualTo(0)
      ? 'paid'
      : newPaid.greaterThan(0)
        ? 'partial'
        : 'unpaid';
    await this.prisma.rentalInvoice.update({
      where: { id: invoice.id },
      data: { status },
    });

    return this.credits(tenantId);
  }

  /** Sum of unpaid balances across the tenant's invoices (net receivable − paid). */
  private async outstandingFor(tenantId: string): Promise<string> {
    const invoices = await this.prisma.rentalInvoice.findMany({
      where: { contract: { tenantId }, status: { not: 'paid' } },
      select: {
        netReceivable: true,
        payments: { select: { amountPaid: true } },
      },
    });
    let total = new Prisma.Decimal(0);
    for (const inv of invoices) {
      const paid = inv.payments.reduce(
        (acc, p) => acc.add(p.amountPaid),
        new Prisma.Decimal(0),
      );
      const balance = inv.netReceivable.sub(paid);
      if (balance.greaterThan(0)) total = total.add(balance);
    }
    return total.toFixed(2);
  }

  private async ensureExists(id: string): Promise<void> {
    const t = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!t) throw this.notFound();
  }

  private notFound() {
    return new AppException(
      ApiCode.NOT_FOUND,
      'Tenant not found.',
      HttpStatus.NOT_FOUND,
    );
  }
}
