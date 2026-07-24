import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { dateOnly } from '../../common/http/serialize';

const DAY = 86_400_000;
const D0 = () => new Prisma.Decimal(0);

/** Last `n` month keys (YYYY-MM), oldest first, ending this month. */
function recentMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

@Injectable()
export class DashboardService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async summary() {
    const [buildings, rooms, occupied, tenants, contracts, receivables] =
      await Promise.all([
        this.prisma.building.count(),
        this.prisma.room.count({ where: { isActive: true } }),
        this.prisma.room.count({
          where: { isActive: true, contracts: { some: { status: 'active' } } },
        }),
        this.prisma.tenant.count({ where: { status: 'active' } }),
        this.prisma.contract.count({ where: { status: 'active' } }),
        this.receivables(),
      ]);

    return {
      buildings,
      rooms,
      occupiedRooms: occupied,
      occupancyRate: rooms ? Math.round((occupied / rooms) * 100) : 0,
      activeTenants: tenants,
      activeContracts: contracts,
      outstandingTotal: receivables.total,
    };
  }

  async incomeTrend(months = 12) {
    const keys = recentMonths(months);
    const result: { month: string; billed: string; collected: string }[] = [];
    for (const key of keys) {
      const invoices = await this.prisma.rentalInvoice.findMany({
        where: { periodMonth: key, status: { not: 'voided' } },
        select: { netReceivable: true },
      });
      const billed = invoices.reduce((a, i) => a.add(i.netReceivable), D0());

      const [y, m] = key.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 1));
      const payments = await this.prisma.rentalPayment.findMany({
        where: { paymentDate: { gte: start, lt: end } },
        select: { amountPaid: true },
      });
      const collected = payments.reduce((a, p) => a.add(p.amountPaid), D0());

      result.push({ month: key, billed: billed.toFixed(2), collected: collected.toFixed(2) });
    }
    return result;
  }

  async occupancy() {
    const buildings = await this.prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        rooms: {
          where: { isActive: true },
          select: { contracts: { where: { status: 'active' }, select: { id: true } } },
        },
      },
    });

    const perBuilding = buildings.map((b) => {
      const total = b.rooms.length;
      const occ = b.rooms.filter((r) => r.contracts.length > 0).length;
      return {
        buildingName: b.name,
        occupied: occ,
        total,
        rate: total ? Math.round((occ / total) * 100) : 0,
      };
    });
    const total = perBuilding.reduce((a, x) => a + x.total, 0);
    const occ = perBuilding.reduce((a, x) => a + x.occupied, 0);
    return {
      portfolio: { occupied: occ, total, rate: total ? Math.round((occ / total) * 100) : 0 },
      perBuilding,
    };
  }

  async receivables() {
    const invoices = await this.prisma.rentalInvoice.findMany({
      where: { status: { notIn: ['paid', 'voided'] } },
      select: {
        netReceivable: true,
        dueDate: true,
        payments: { select: { amountPaid: true } },
      },
    });
    const b = { current: D0(), days30: D0(), days60: D0(), days90Plus: D0() };
    for (const inv of invoices) {
      const paid = inv.payments.reduce((a, p) => a.add(p.amountPaid), D0());
      const balance = inv.netReceivable.sub(paid);
      if (balance.lessThanOrEqualTo(0)) continue;
      const d = Math.floor((Date.now() - inv.dueDate.getTime()) / DAY);
      if (d <= 0) b.current = b.current.add(balance);
      else if (d <= 30) b.days30 = b.days30.add(balance);
      else if (d <= 60) b.days60 = b.days60.add(balance);
      else b.days90Plus = b.days90Plus.add(balance);
    }
    const total = b.current.add(b.days30).add(b.days60).add(b.days90Plus);
    return {
      current: b.current.toFixed(2),
      days30: b.days30.toFixed(2),
      days60: b.days60.toFixed(2),
      days90Plus: b.days90Plus.toFixed(2),
      total: total.toFixed(2),
    };
  }

  async utilityCosts(months = 12) {
    const keys = recentMonths(months);
    const bills = await this.prisma.utilityBill.findMany({
      where: { billingPeriod: { in: keys } },
      select: { billingPeriod: true, utilityType: true, amount: true },
    });
    return keys.map((key) => {
      const forMonth = bills.filter((x) => x.billingPeriod === key);
      const telephone = forMonth
        .filter((x) => x.utilityType === 'telephone')
        .reduce((a, x) => a.add(x.amount), D0());
      const internet = forMonth
        .filter((x) => x.utilityType === 'internet')
        .reduce((a, x) => a.add(x.amount), D0());
      const total = forMonth.reduce((a, x) => a.add(x.amount), D0());
      return {
        month: key,
        telephone: telephone.toFixed(2),
        internet: internet.toFixed(2),
        total: total.toFixed(2),
      };
    });
  }

  async expiring(days = 90) {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { gte: new Date(), lte: new Date(Date.now() + days * DAY) },
      },
      orderBy: { endDate: 'asc' },
      include: {
        tenant: { select: { businessName: true } },
        room: { select: { roomNumber: true, building: { select: { name: true } } } },
      },
    });
    return contracts.map((c) => ({
      id: c.id,
      tenantName: c.tenant.businessName,
      buildingName: c.room.building.name,
      roomNumber: c.room.roomNumber,
      endDate: dateOnly(c.endDate),
      daysLeft: Math.ceil((c.endDate.getTime() - Date.now()) / DAY),
    }));
  }

  async topTenants(limit = 10) {
    const payments = await this.prisma.rentalPayment.findMany({
      select: {
        amountPaid: true,
        invoice: { select: { contract: { select: { tenant: { select: { id: true, businessName: true } } } } } },
      },
    });
    const byTenant = new Map<string, { name: string; revenue: Prisma.Decimal }>();
    for (const p of payments) {
      const t = p.invoice.contract.tenant;
      const cur = byTenant.get(t.id) ?? { name: t.businessName, revenue: D0() };
      cur.revenue = cur.revenue.add(p.amountPaid);
      byTenant.set(t.id, cur);
    }
    return [...byTenant.entries()]
      .map(([id, v]) => ({ tenantId: id, tenantName: v.name, revenue: v.revenue.toFixed(2) }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))
      .slice(0, limit);
  }
}
