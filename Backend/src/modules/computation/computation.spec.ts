import {
  computeInvoiceAmounts,
  computeInvoiceForPeriod,
  escalate,
  escalationPeriods,
  round2,
} from './computation';

describe('computation.round2', () => {
  it('rounds half-up to two decimals', () => {
    expect(round2('1312.505').toFixed(2)).toBe('1312.51');
    expect(round2('1312.504').toFixed(2)).toBe('1312.50');
  });
});

describe('computation.escalationPeriods (anniversary-based)', () => {
  const anchor = { year: 2025, month: 1 };
  it('is 0 before the first anniversary', () => {
    expect(escalationPeriods(anchor, { year: 2025, month: 12 })).toBe(0);
    expect(escalationPeriods(anchor, { year: 2025, month: 1 })).toBe(0);
  });
  it('is 1 at the first anniversary and within that year', () => {
    expect(escalationPeriods(anchor, { year: 2026, month: 1 })).toBe(1);
    expect(escalationPeriods(anchor, { year: 2026, month: 3 })).toBe(1);
    expect(escalationPeriods(anchor, { year: 2026, month: 12 })).toBe(1);
  });
  it('is 2 at the second anniversary', () => {
    expect(escalationPeriods(anchor, { year: 2027, month: 1 })).toBe(2);
  });
  it('never negative for target before anchor', () => {
    expect(escalationPeriods(anchor, { year: 2024, month: 6 })).toBe(0);
  });
});

describe('computation.escalate', () => {
  it('returns base when no periods elapsed', () => {
    expect(escalate('25000.00', '0.05', 0).toFixed(2)).toBe('25000.00');
  });
  it('compounds by default', () => {
    expect(escalate('25000.00', '0.05', 1).toFixed(2)).toBe('26250.00');
    expect(escalate('25000.00', '0.05', 2).toFixed(2)).toBe('27562.50');
  });
  it('supports simple escalation', () => {
    expect(escalate('25000.00', '0.05', 2, 'simple').toFixed(2)).toBe('27500.00');
  });
});

describe('computation.computeInvoiceAmounts', () => {
  it('matches the API-CONTRACT worked example (base 26250, VAT 12%, WHT 5% net of VAT)', () => {
    const r = computeInvoiceAmounts('26250.00', '0.12', '0.05');
    expect(r).toEqual({
      effectiveBasicRent: '26250.00',
      vatAmount: '3150.00',
      grossRent: '29400.00',
      whtAmount: '1312.50',
      netReceivable: '28087.50',
    });
  });

  it('WHT base is net of VAT (base × whtRate), not gross', () => {
    const r = computeInvoiceAmounts('10000.00', '0.12', '0.05');
    // wht = 10000 * 0.05 = 500.00  (gross-based would be 560.00)
    expect(r.whtAmount).toBe('500.00');
    expect(r.grossRent).toBe('11200.00');
    expect(r.netReceivable).toBe('10700.00');
  });

  it('rounds at each step so amounts reconcile', () => {
    const r = computeInvoiceAmounts('12345.67', '0.12', '0.05');
    expect(r.vatAmount).toBe('1481.48'); // 1481.4804 → 1481.48
    expect(r.grossRent).toBe('13827.15');
    expect(r.whtAmount).toBe('617.28'); // 617.2835 → 617.28
    expect(r.netReceivable).toBe('13209.87');
  });
});

describe('computation.computeInvoiceForPeriod', () => {
  it('escalates one year in, then computes (contract example)', () => {
    const r = computeInvoiceForPeriod({
      basicRent: '25000.00',
      escalationRate: '0.05',
      vatRate: '0.12',
      whtRate: '0.05',
      anchor: { year: 2025, month: 3 },
      target: { year: 2026, month: 3 },
    });
    expect(r.periods).toBe(1);
    expect(r.effectiveBasicRent).toBe('26250.00');
    expect(r.netReceivable).toBe('28087.50');
  });

  it('no escalation in the first year', () => {
    const r = computeInvoiceForPeriod({
      basicRent: '25000.00',
      escalationRate: '0.05',
      vatRate: '0.12',
      whtRate: '0.05',
      anchor: { year: 2025, month: 3 },
      target: { year: 2025, month: 9 },
    });
    expect(r.periods).toBe(0);
    expect(r.effectiveBasicRent).toBe('25000.00');
  });
});
