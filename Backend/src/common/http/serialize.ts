import { Prisma } from '@prisma/client';

/** Money → string with exactly two decimals (API-CONTRACT.md). Never a number. */
export function money(d: Prisma.Decimal | null | undefined): string | null {
  return d == null ? null : d.toFixed(2);
}

/** Rates keep their full stored precision (e.g. "0.0500"). */
export function rate(d: Prisma.Decimal | null | undefined): string | null {
  return d == null ? null : d.toString();
}

/** Date-only fields serialize as `YYYY-MM-DD`. */
export function dateOnly(d: Date | null | undefined): string | null {
  return d == null ? null : d.toISOString().slice(0, 10);
}

/** Timestamps serialize as full ISO 8601. */
export function iso(d: Date | null | undefined): string | null {
  return d == null ? null : d.toISOString();
}
