import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { Paginated, parsePagination } from '../../common/http/pagination';
import { dateOnly, money } from '../../common/http/serialize';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list(query: { page?: string; pageSize?: string; search?: string }) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.TenantWhereInput = query.search
      ? {
          OR: [
            { businessName: { contains: query.search, mode: 'insensitive' } },
            { contactPerson: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { tin: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { businessName: 'asc' },
        skip,
        take,
        include: {
          _count: { select: { contracts: { where: { status: 'active' } } } },
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
