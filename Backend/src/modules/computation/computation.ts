import Decimal from 'decimal.js';

/**
 * PURE computation core (SPEC 6.7). No Prisma, no NestJS, no I/O. Callers fetch
 * settings (rates) and contract values and pass them in. All arithmetic uses
 * decimal.js and rounds to 2 dp at each step so stored values reconcile against
 * a hand calculation. Money in/out as strings; never JavaScript numbers.
 *
 * ── Open items (SPEC §9) — decisions encoded here, confirm with client ──
 * • WHT base: NET OF VAT (i.e. the effective basic rent, before VAT). This
 *   matches SPEC 6.7. Do not change without instruction (CLAUDE.md).
 * • Escalation mode: COMPOUND by default (rent × (1+rate)^periods).
 *   `EscalationMode` allows 'simple' if the client's Excel differs.
 * • Escalation cadence: ANNIVERSARY-based — one step per full year elapsed
 *   since the anchor date. Calendar-year cadence is the alternative; if the
 *   client uses it, change `escalationPeriods` only.
 */

export type EscalationMode = 'compound' | 'simple';

const ROUND = Decimal.ROUND_HALF_UP;

function d(v: Decimal.Value): Decimal {
  return new Decimal(v);
}

/** Round to 2 decimal places (money), half-up. */
export function round2(v: Decimal.Value): Decimal {
  return d(v).toDecimalPlaces(2, ROUND);
}

/**
 * Full escalation periods elapsed as of the target month.
 * Anniversary-based: whole years between the anchor month and the target month.
 * TODO: confirm with client — anniversary vs calendar-year cadence.
 */
export function escalationPeriods(
  anchor: { year: number; month: number },
  target: { year: number; month: number },
): number {
  const months =
    target.year * 12 + (target.month - 1) - (anchor.year * 12 + (anchor.month - 1));
  if (months <= 0) return 0;
  return Math.floor(months / 12);
}

/**
 * Effective basic rent after `periods` escalations.
 * compound: base × (1+rate)^periods   simple: base × (1 + rate×periods)
 * Rounded to 2 dp.
 */
export function escalate(
  basicRent: Decimal.Value,
  escalationRate: Decimal.Value,
  periods: number,
  mode: EscalationMode = 'compound',
): Decimal {
  const base = d(basicRent);
  const rate = d(escalationRate);
  if (periods <= 0) return round2(base);

  if (mode === 'simple') {
    return round2(base.times(d(1).plus(rate.times(periods))));
  }
  const factor = d(1).plus(rate).pow(periods);
  return round2(base.times(factor));
}

export interface InvoiceAmounts {
  effectiveBasicRent: string;
  vatAmount: string;
  grossRent: string;
  whtAmount: string;
  netReceivable: string;
}

/**
 * Per-invoice amounts from an already-escalated basic rent (SPEC 6.7):
 *   vat   = base × vatRate
 *   gross = base + vat
 *   wht   = base × whtRate        (WHT base = net of VAT)
 *   net   = gross − wht
 * Each step rounded to 2 dp.
 */
export function computeInvoiceAmounts(
  effectiveBasicRent: Decimal.Value,
  vatRate: Decimal.Value,
  whtRate: Decimal.Value,
): InvoiceAmounts {
  const base = round2(effectiveBasicRent);
  const vat = round2(base.times(vatRate));
  const gross = round2(base.plus(vat));
  const wht = round2(base.times(whtRate));
  const net = round2(gross.minus(wht));

  return {
    effectiveBasicRent: base.toFixed(2),
    vatAmount: vat.toFixed(2),
    grossRent: gross.toFixed(2),
    whtAmount: wht.toFixed(2),
    netReceivable: net.toFixed(2),
  };
}

/**
 * Convenience: escalate then compute, for a target period.
 */
export function computeInvoiceForPeriod(input: {
  basicRent: Decimal.Value;
  escalationRate: Decimal.Value;
  vatRate: Decimal.Value;
  whtRate: Decimal.Value;
  anchor: { year: number; month: number };
  target: { year: number; month: number };
  mode?: EscalationMode;
}): InvoiceAmounts & { periods: number } {
  const periods = escalationPeriods(input.anchor, input.target);
  const effective = escalate(
    input.basicRent,
    input.escalationRate,
    periods,
    input.mode ?? 'compound',
  );
  return {
    periods,
    ...computeInvoiceAmounts(effective, input.vatRate, input.whtRate),
  };
}
