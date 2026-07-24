/**
 * Shared display formatters. The backend computes all values; the frontend
 * only formats them (CLAUDE.md: no business calculations on the frontend).
 */

const PHP = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Currency as PHP with two decimals. Accepts the string money values from the API. */
export function formatPHP(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return PHP.format(n);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Dates display as `DD MMM YYYY` (e.g. 05 Mar 2026). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${dd} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/** Month identifier `YYYY-MM` → `MMM YYYY` (e.g. Mar 2026). */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "—";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS[m - 1]} ${y}`;
}
