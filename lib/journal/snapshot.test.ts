import { describe, expect, it } from 'vitest';
import { buildRulesSnapshot, pickFirstCycleCap, type OfferRuleRow, type PayoutCapRow } from './snapshot';

const OFFER: OfferRuleRow = {
  account_size: 50_000,
  currency: 'USD',
  drawdown_type: 'TRAIL',
  drawdown_amount: 2_000,
  profit_target: 3_000,
  daily_loss_limit: 1_000,
  consistency_pct: 50,
  min_trading_days: 5,
  funded_drawdown_type: null,
  funded_daily_loss: null,
  funded_consistency_pct: 20,
  payout_buffer: 100,
  payout_min_amount: 0,
  payout_min_days: 5,
  payout_daily_threshold: 150,
  profit_split: 90,
  payout_model: 'fixed_cap',
};
const FIRM = { name: 'Topstep', slug: 'topstep' };
const PLAN = { name: 'Pro', slug: 'pro' };

function cap(from: number | null, to: number | null, max: number | null): PayoutCapRow {
  return { cycle_from: from, cycle_to: to, max_amount: max, max_pct: null, min_profit: null };
}

describe('pickFirstCycleCap — plafond du 1er cycle', () => {
  it('choisit le cap qui couvre le payout n°1', () => {
    const caps = [cap(1, 2, 2_000), cap(3, 4, 3_000), cap(5, null, 5_000)];
    expect(pickFirstCycleCap(caps)?.max_amount).toBe(2_000);
  });

  it('ordre d’entrée indifférent : prend toujours le cycle le plus bas', () => {
    const caps = [cap(5, null, 5_000), cap(1, 2, 2_000), cap(3, 4, 3_000)];
    expect(pickFirstCycleCap(caps)?.max_amount).toBe(2_000);
  });

  it('sans cap couvrant explicitement le cycle 1, retombe sur le plus bas cycle_from', () => {
    const caps = [cap(2, 4, 3_000), cap(5, null, 5_000)];
    expect(pickFirstCycleCap(caps)?.max_amount).toBe(3_000);
  });

  it('liste vide → null', () => {
    expect(pickFirstCycleCap([])).toBeNull();
  });
});

describe('buildRulesSnapshot — câblage des caps', () => {
  it('alimente maxAmount/maxPct/minCycleProfit depuis le cap du 1er cycle', () => {
    const caps: PayoutCapRow[] = [
      { cycle_from: 1, cycle_to: 2, max_amount: 2_000, max_pct: 50, min_profit: 500 },
      { cycle_from: 3, cycle_to: null, max_amount: 5_000, max_pct: null, min_profit: null },
    ];
    const snap = buildRulesSnapshot(OFFER, 'futures', FIRM, PLAN, caps);
    expect(snap.payout.maxAmount).toBe(2_000);
    expect(snap.payout.maxPct).toBe(50);
    expect(snap.payout.minCycleProfit).toBe(500);
  });

  it('sans caps → plafonds nuls (aucune contrainte de plafond)', () => {
    const snap = buildRulesSnapshot(OFFER, 'futures', FIRM, PLAN);
    expect(snap.payout.maxAmount).toBeNull();
    expect(snap.payout.maxPct).toBeNull();
    expect(snap.payout.minCycleProfit).toBeNull();
  });
});
