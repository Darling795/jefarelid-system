import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';

export interface SearchResult {
  type: 'tenant' | 'building' | 'contract' | 'invoice';
  label: string;
  sublabel: string;
  href: string;
}

@Injectable()
export class SearchService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async search(q?: string): Promise<SearchResult[]> {
    const term = (q ?? '').trim();
    if (term.length < 1) return [];
    const contains: Prisma.StringFilter = { contains: term, mode: 'insensitive' };

    const [tenants, buildings, contracts, invoices] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { OR: [{ businessName: contains }, { tin: contains }] },
        take: 5,
        select: { id: true, businessName: true },
      }),
      this.prisma.building.findMany({
        where: { name: contains },
        take: 5,
        select: { id: true, name: true },
      }),
      this.prisma.contract.findMany({
        where: {
          OR: [
            { tenant: { businessName: contains } },
            { room: { roomNumber: contains } },
          ],
        },
        take: 5,
        include: {
          tenant: { select: { businessName: true } },
          room: { select: { roomNumber: true, building: { select: { name: true } } } },
        },
      }),
      this.prisma.rentalInvoice.findMany({
        where: {
          OR: [
            { periodMonth: contains },
            { contract: { tenant: { businessName: contains } } },
          ],
        },
        take: 5,
        orderBy: { periodMonth: 'desc' },
        include: {
          contract: { select: { tenant: { select: { businessName: true } } } },
        },
      }),
    ]);

    const results: SearchResult[] = [];
    for (const t of tenants) {
      results.push({ type: 'tenant', label: t.businessName, sublabel: 'Tenant', href: `/tenants/${t.id}` });
    }
    for (const b of buildings) {
      results.push({ type: 'building', label: b.name, sublabel: 'Building', href: `/buildings/${b.id}` });
    }
    for (const c of contracts) {
      results.push({
        type: 'contract',
        label: c.tenant.businessName,
        sublabel: `Contract · ${c.room.building.name} ${c.room.roomNumber}`,
        href: `/contracts/${c.id}`,
      });
    }
    for (const inv of invoices) {
      results.push({
        type: 'invoice',
        label: inv.contract.tenant.businessName,
        sublabel: `Invoice · ${inv.periodMonth}`,
        href: `/invoices/${inv.id}`,
      });
    }
    return results;
  }
}
