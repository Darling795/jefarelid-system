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

/**
 * Floor area with the square-metre unit, thousands-separated and 2 dp
 * (e.g. `1,250.00 sq.m.`). Returns "—" when unknown.
 * TODO: confirm with client — exact area display wording requested by the panel.
 */
export function formatArea(sqm: string | number | null | undefined): string {
  if (sqm === null || sqm === undefined || sqm === "") return "—";
  const n = typeof sqm === "string" ? Number(sqm) : sqm;
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sq.m.`;
}

/**
 * Date WITH time, `DD MMM YYYY · HH:mm` (e.g. 05 Mar 2026 · 14:30), in local
 * time. Used where the panel asked for timestamps (audit trail, invoice records).
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${dd} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()} · ${hh}:${mm}`;
}

/**
 * Display label for a role. Per the client panel, the owner account shows as
 * "Admin" and the secretarial staff accounts show as "Secretary". The stored
 * role values (`super_admin` / `admin`) and all server-side authorization are
 * unchanged — this is presentation only.
 */
export function roleLabel(role: "super_admin" | "admin"): string {
  return role === "super_admin" ? "Admin" : "Secretary";
}

/** Month identifier `YYYY-MM` → `MMM YYYY` (e.g. Mar 2026). */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "—";
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS[m - 1]} ${y}`;
}
