import { Inject, Injectable } from '@nestjs/common';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { money } from '../../common/http/serialize';
import { sumPaid } from '../invoices/invoice.util';
import { SettingsService } from '../settings/settings.service';

const DAY = 86_400_000;

export type AlertSeverity = 'danger' | 'warning' | 'info';

export interface AlertItem {
  id: string;
  type:
    | 'rent_overdue'
    | 'rent_due'
    | 'contract_expiring'
    | 'utility_overdue'
    | 'utility_due';
  severity: AlertSeverity;
  title: string;
  message: string;
  href: string;
  date: string; // the relevant date (due/expiry), YYYY-MM-DD
}

const RANK: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };

/**
 * In-app alerts (no email). Computed live from current data and shown to staff
 * in the header bell + on the dashboard. Covers rent due/overdue, contracts
 * expiring, and utility bills due/overdue.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: ExtendedPrismaClient,
    private readonly settings: SettingsService,
  ) {}

  async alerts(): Promise<AlertItem[]> {
    const now = new Date();
    const soon = new Date(Date.now() + 3 * DAY);
    const alerts: AlertItem[] = [];

    // ── Rent overdue ───────────────────────────────────────────────────
    const overdue = await this.prisma.rentalInvoice.findMany({
      where: { status: { in: ['unpaid', 'partial'] }, dueDate: { lt: now } },
      include: {
        contract: { select: { tenant: { select: { businessName: true } } } },
        payments: { select: { amountPaid: true } },
      },
    });
    for (const inv of overdue) {
      const balance = inv.netReceivable.sub(sumPaid(inv.payments));
      const daysLate = Math.floor((Date.now() - inv.dueDate.getTime()) / DAY);
      alerts.push({
        id: `rent_overdue:${inv.id}`,
        type: 'rent_overdue',
        severity: 'danger',
        title: 'Rent overdue',
        message: `${inv.contract.tenant.businessName} · ${inv.periodMonth} · ${money(balance)} outstanding (${daysLate}d late)`,
        href: `/invoices/${inv.id}`,
        date: inv.dueDate.toISOString().slice(0, 10),
      });
    }

    // ── Rent due within 3 days ─────────────────────────────────────────
    const dueSoon = await this.prisma.rentalInvoice.findMany({
      where: { status: { in: ['unpaid', 'partial'] }, dueDate: { gte: now, lte: soon } },
      include: {
        contract: { select: { tenant: { select: { businessName: true } } } },
        payments: { select: { amountPaid: true } },
      },
    });
    for (const inv of dueSoon) {
      const balance = inv.netReceivable.sub(sumPaid(inv.payments));
      const daysLeft = Math.ceil((inv.dueDate.getTime() - Date.now()) / DAY);
      alerts.push({
        id: `rent_due:${inv.id}`,
        type: 'rent_due',
        severity: 'warning',
        title: 'Rent due soon',
        message: `${inv.contract.tenant.businessName} · ${inv.periodMonth} · ${money(balance)} due in ${daysLeft}d`,
        href: `/invoices/${inv.id}`,
        date: inv.dueDate.toISOString().slice(0, 10),
      });
    }

    // ── Contracts expiring (within the largest lead time) ──────────────
    const leadDays = (await this.settings.getMap()).notification_lead_days ?? '90,60,30';
    const maxLead = Math.max(...leadDays.split(',').map(Number).filter(Boolean), 90);
    const expiring = await this.prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { gte: now, lte: new Date(Date.now() + maxLead * DAY) },
      },
      include: {
        tenant: { select: { businessName: true } },
        room: { select: { roomNumber: true, building: { select: { name: true } } } },
      },
    });
    for (const c of expiring) {
      const daysLeft = Math.ceil((c.endDate.getTime() - Date.now()) / DAY);
      alerts.push({
        id: `contract_expiring:${c.id}`,
        type: 'contract_expiring',
        severity: daysLeft <= 30 ? 'danger' : 'warning',
        title: 'Contract expiring',
        message: `${c.tenant.businessName} · ${c.room.building.name} ${c.room.roomNumber} · ends in ${daysLeft}d`,
        href: `/contracts/${c.id}`,
        date: c.endDate.toISOString().slice(0, 10),
      });
    }

    // ── Utility bills overdue / due soon ───────────────────────────────
    const utilOverdue = await this.prisma.utilityBill.findMany({
      where: { status: 'unpaid', dueDate: { lt: now } },
      include: { building: { select: { name: true } } },
    });
    for (const b of utilOverdue) {
      alerts.push({
        id: `utility_overdue:${b.id}`,
        type: 'utility_overdue',
        severity: 'danger',
        title: 'Utility bill overdue',
        message: `${b.building.name} · ${b.utilityType} · ${b.billingPeriod} · ${money(b.amount)}`,
        href: `/utilities`,
        date: b.dueDate.toISOString().slice(0, 10),
      });
    }
    const utilDue = await this.prisma.utilityBill.findMany({
      where: { status: 'unpaid', dueDate: { gte: now, lte: soon } },
      include: { building: { select: { name: true } } },
    });
    for (const b of utilDue) {
      alerts.push({
        id: `utility_due:${b.id}`,
        type: 'utility_due',
        severity: 'warning',
        title: 'Utility bill due soon',
        message: `${b.building.name} · ${b.utilityType} · ${b.billingPeriod} · ${money(b.amount)}`,
        href: `/utilities`,
        date: b.dueDate.toISOString().slice(0, 10),
      });
    }

    return alerts.sort(
      (a, b) => RANK[a.severity] - RANK[b.severity] || a.date.localeCompare(b.date),
    );
  }
}
