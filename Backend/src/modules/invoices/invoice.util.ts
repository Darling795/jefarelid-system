import { Prisma } from '@prisma/client';

export function sumPaid(payments: { amountPaid: Prisma.Decimal }[]): Prisma.Decimal {
  return payments.reduce(
    (acc, p) => acc.add(p.amountPaid),
    new Prisma.Decimal(0),
  );
}

/**
 * Display status derived on read. `amountPaid` and `balance` are never stored
 * (API-CONTRACT.md). "overdue" is derived from the due date; "voided" is stored.
 */
export function displayStatus(
  storedStatus: string,
  netReceivable: Prisma.Decimal,
  paid: Prisma.Decimal,
  dueDate: Date,
): string {
  if (storedStatus === 'voided') return 'voided';
  const balance = netReceivable.sub(paid);
  if (balance.lessThanOrEqualTo(0)) return 'paid';
  const overdue = dueDate.getTime() < Date.now();
  if (paid.greaterThan(0)) return overdue ? 'overdue' : 'partial';
  return overdue ? 'overdue' : 'unpaid';
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
