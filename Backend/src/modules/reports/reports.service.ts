import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ReportTable } from './export.util';

const D0 = () => new Prisma.Decimal(0);
const day = (d: Date) => d.toISOString().slice(0, 10);
const M = (d: Prisma.Decimal) => d.toFixed(2);

@Injectable()
export class ReportsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async billingStatement(tenantId?: string, periodMonth?: string): Promise<ReportTable> {
    const invoices = await this.prisma.rentalInvoice.findMany({
      where: {
        status: { not: 'voided' },
        ...(periodMonth ? { periodMonth } : {}),
        ...(tenantId ? { contract: { tenantId } } : {}),
      },
      orderBy: { periodMonth: 'desc' },
      include: {
        contract: {
          select: {
            tenant: { select: { businessName: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
    });
    return {
      title: 'Billing Statement',
      subtitle: [tenantId ? `Tenant filter applied` : 'All tenants', periodMonth]
        .filter(Boolean)
        .join(' · '),
      columns: [
        { key: 'period', label: 'Period' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'room', label: 'Room' },
        { key: 'basic', label: 'Basic rent', align: 'right' },
        { key: 'vat', label: 'VAT', align: 'right' },
        { key: 'wht', label: 'WHT', align: 'right' },
        { key: 'net', label: 'Net receivable', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
      rows: invoices.map((i) => ({
        period: i.periodMonth,
        tenant: i.contract.tenant.businessName,
        room: i.contract.room.roomNumber,
        basic: M(i.basicRentApplied),
        vat: M(i.vatAmount),
        wht: M(i.whtAmount),
        net: M(i.netReceivable),
        status: i.status,
      })),
    };
  }

  async paymentHistory(tenantId?: string, dateFrom?: string, dateTo?: string): Promise<ReportTable> {
    const payments = await this.prisma.rentalPayment.findMany({
      where: {
        ...(tenantId ? { invoice: { contract: { tenantId } } } : {}),
        ...this.dateRange('paymentDate', dateFrom, dateTo),
      },
      orderBy: { paymentDate: 'desc' },
      include: {
        invoice: {
          select: {
            periodMonth: true,
            contract: { select: { tenant: { select: { businessName: true } } } },
          },
        },
      },
    });
    return {
      title: 'Payment History',
      subtitle: [dateFrom, dateTo].filter(Boolean).join(' → '),
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'period', label: 'Period' },
        { key: 'or', label: 'OR #' },
        { key: 'method', label: 'Method' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: payments.map((p) => ({
        date: day(p.paymentDate),
        tenant: p.invoice.contract.tenant.businessName,
        period: p.invoice.periodMonth,
        or: p.orNumber ?? '',
        method: p.paymentMethod ?? '',
        amount: M(p.amountPaid),
      })),
    };
  }

  async collection(dateFrom?: string, dateTo?: string, buildingId?: string): Promise<ReportTable> {
    const payments = await this.prisma.rentalPayment.findMany({
      where: {
        ...this.dateRange('paymentDate', dateFrom, dateTo),
        ...(buildingId ? { invoice: { contract: { room: { buildingId } } } } : {}),
      },
      orderBy: { paymentDate: 'asc' },
      include: {
        invoice: {
          select: {
            periodMonth: true,
            contract: {
              select: {
                tenant: { select: { businessName: true } },
                room: { select: { roomNumber: true, building: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });
    const total = payments.reduce((a, p) => a.add(p.amountPaid), D0());
    return {
      title: 'Collection Report',
      subtitle: `${[dateFrom, dateTo].filter(Boolean).join(' → ')}  ·  Total collected: PHP ${M(total)}`,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'building', label: 'Building' },
        { key: 'room', label: 'Room' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: payments.map((p) => ({
        date: day(p.paymentDate),
        building: p.invoice.contract.room.building.name,
        room: p.invoice.contract.room.roomNumber,
        tenant: p.invoice.contract.tenant.businessName,
        amount: M(p.amountPaid),
      })),
    };
  }

  async occupancy(): Promise<ReportTable> {
    const buildings = await this.prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        rooms: {
          where: { isActive: true },
          include: {
            contracts: {
              where: { status: 'active' },
              include: { tenant: { select: { businessName: true } } },
            },
          },
        },
      },
    });
    const rows: ReportTable['rows'] = [];
    for (const b of buildings) {
      for (const r of b.rooms) {
        rows.push({
          building: b.name,
          room: r.roomNumber,
          status: r.contracts.length ? 'Occupied' : 'Vacant',
          tenant: r.contracts[0]?.tenant.businessName ?? '',
        });
      }
    }
    return {
      title: 'Occupancy Report',
      columns: [
        { key: 'building', label: 'Building' },
        { key: 'room', label: 'Room' },
        { key: 'status', label: 'Status' },
        { key: 'tenant', label: 'Current tenant' },
      ],
      rows,
    };
  }

  async utilityExpense(dateFrom?: string, dateTo?: string, buildingId?: string): Promise<ReportTable> {
    const bills = await this.prisma.utilityBill.findMany({
      where: {
        ...this.dateRange('dueDate', dateFrom, dateTo),
        ...(buildingId ? { buildingId } : {}),
      },
      orderBy: { billingPeriod: 'desc' },
      include: { building: { select: { name: true } } },
    });
    const total = bills.reduce((a, b) => a.add(b.amount), D0());
    return {
      title: 'Utility Expense Report',
      subtitle: `Total: PHP ${M(total)}`,
      columns: [
        { key: 'period', label: 'Period' },
        { key: 'building', label: 'Building' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'status', label: 'Status' },
      ],
      rows: bills.map((b) => ({
        period: b.billingPeriod,
        building: b.building.name,
        type: b.utilityType,
        amount: M(b.amount),
        status: b.status,
      })),
    };
  }

  async contractExpiry(days = 90): Promise<ReportTable> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { gte: new Date(), lte: new Date(Date.now() + days * 86_400_000) },
      },
      orderBy: { endDate: 'asc' },
      include: {
        tenant: { select: { businessName: true } },
        room: { select: { roomNumber: true, building: { select: { name: true } } } },
      },
    });
    return {
      title: `Contract Expiry Report (next ${days} days)`,
      columns: [
        { key: 'tenant', label: 'Tenant' },
        { key: 'building', label: 'Building' },
        { key: 'room', label: 'Room' },
        { key: 'end', label: 'End date' },
      ],
      rows: contracts.map((c) => ({
        tenant: c.tenant.businessName,
        building: c.room.building.name,
        room: c.room.roomNumber,
        end: day(c.endDate),
      })),
    };
  }

  async taxSummary(periodFrom?: string, periodTo?: string): Promise<ReportTable> {
    const where: Prisma.RentalInvoiceWhereInput = { status: { not: 'voided' } };
    if (periodFrom || periodTo) {
      where.periodMonth = {};
      if (periodFrom) where.periodMonth.gte = periodFrom;
      if (periodTo) where.periodMonth.lte = periodTo;
    }
    const invoices = await this.prisma.rentalInvoice.findMany({ where, orderBy: { periodMonth: 'asc' } });

    const byPeriod = new Map<string, { basic: Prisma.Decimal; vat: Prisma.Decimal; wht: Prisma.Decimal; net: Prisma.Decimal; count: number }>();
    for (const i of invoices) {
      const cur = byPeriod.get(i.periodMonth) ?? { basic: D0(), vat: D0(), wht: D0(), net: D0(), count: 0 };
      cur.basic = cur.basic.add(i.basicRentApplied);
      cur.vat = cur.vat.add(i.vatAmount);
      cur.wht = cur.wht.add(i.whtAmount);
      cur.net = cur.net.add(i.netReceivable);
      cur.count += 1;
      byPeriod.set(i.periodMonth, cur);
    }

    const rows = [...byPeriod.entries()].map(([period, v]) => ({
      period,
      count: v.count,
      basic: M(v.basic),
      vat: M(v.vat),
      wht: M(v.wht),
      net: M(v.net),
    }));

    return {
      title: 'VAT & WHT Summary (BIR)',
      subtitle: [periodFrom, periodTo].filter(Boolean).join(' → '),
      columns: [
        { key: 'period', label: 'Period' },
        { key: 'count', label: 'Invoices', align: 'right' },
        { key: 'basic', label: 'Basic rent', align: 'right' },
        { key: 'vat', label: 'VAT (output)', align: 'right' },
        { key: 'wht', label: 'WHT withheld', align: 'right' },
        { key: 'net', label: 'Net receivable', align: 'right' },
      ],
      rows,
    };
  }

  private dateRange(field: string, from?: string, to?: string) {
    if (!from && !to) return {};
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    return { [field]: range };
  }
}
