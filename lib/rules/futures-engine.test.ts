import { describe, expect, it } from 'vitest';
import {
  computeDrawdownFloor,
  evaluateFuturesAccount,
  evaluatePayout,
  pnlByDay,
} from './futures-engine';
import type { OfferRules, PayoutRules, Trade } from './types';

/** Topstep 50k : EOD 2000, objectif 3000, cohérence 50%, 2 jours min. */
const TOPSTEP_50K: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'EOD',
  drawdownAmount: 2_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_000,
  consistencyPct: 50,
  minTradingDays: 2,
};

/** Apex Intraday 50k : TRAIL 2500, pas de cohérence. */
const APEX_50K: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'TRAIL',
  drawdownAmount: 2_500,
  profitTarget: 3_000,
  dailyLossLimit: null,
  consistencyPct: 100,
  minTradingDays: 1,
};

/** Phidias 25k : STATIC 500. */
const PHIDIAS_25K: OfferRules = {
  marketType: 'futures',
  accountSize: 25_000,
  drawdownType: 'STATIC',
  drawdownAmount: 500,
  profitTarget: 1_500,
  dailyLossLimit: null,
  consistencyPct: 100,
  minTradingDays: 1,
};

const t = (date: string, pnl: number, id = `${date}-${pnl}`): Trade => ({
  id,
  tradeDate: date,
  closedAt: `${date}T15:30:00Z`,
  pnl,
});

describe('pnlByDay', () => {
  it('agrège par journée', () => {
    const m = pnlByDay([t('2026-01-05', 300), t('2026-01-05', -100), t('2026-01-06', 500)]);
    expect(m.get('2026-01-05')).toBe(200);
    expect(m.get('2026-01-06')).toBe(500);
  });
});

describe('drawdown STATIC', () => {
  it('plancher fixe', () => {
    const { floor } = computeDrawdownFloor(PHIDIAS_25K, 25_000, [t('2026-01-05', 2_000)]);
    expect(floor).toBe(24_500);
  });
});

describe('drawdown EOD', () => {
  it('suit les clôtures journalières', () => {
    const { floor, highWaterMark } = computeDrawdownFloor(TOPSTEP_50K, 50_000, [
      t('2026-01-05', 1_000),
      t('2026-01-06', 500),
    ]);
    expect(highWaterMark).toBe(51_500);
    expect(floor).toBe(49_500);
  });

  it('ignore un pic intraday refermé le même jour', () => {
    const { floor, highWaterMark } = computeDrawdownFloor(TOPSTEP_50K, 50_000, [
      t('2026-01-05', 2_000, 'a'),
      t('2026-01-05', -2_000, 'b'),
    ]);
    expect(highWaterMark).toBe(50_000);
    expect(floor).toBe(48_000);
  });
});

describe('drawdown TRAIL', () => {
  it('suit le plus haut même refermé', () => {
    const { floor, highWaterMark } = computeDrawdownFloor(APEX_50K, 50_000, [
      t('2026-01-05', 2_000, 'a'),
      t('2026-01-05', -2_000, 'b'),
    ]);
    expect(highWaterMark).toBe(52_000);
    expect(floor).toBe(49_500);
  });

  it('est plus sévère que l’EOD sur le même scénario', () => {
    const trades = [t('2026-01-05', 2_000, 'a'), t('2026-01-05', -2_000, 'b')];
    const trail = computeDrawdownFloor(APEX_50K, 50_000, trades).floor;
    const eod = computeDrawdownFloor(
      { ...TOPSTEP_50K, drawdownAmount: 2_500 },
      50_000,
      trades,
    ).floor;
    expect(trail).toBeGreaterThan(eod);
  });

  it('se verrouille au capital initial', () => {
    const { floor } = computeDrawdownFloor(APEX_50K, 50_000, [t('2026-01-05', 10_000)]);
    expect(floor).toBe(50_000);
  });
});

describe('daily loss', () => {
  it('calcule le restant du jour', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [t('2026-01-05', -400)], '2026-01-05');
    expect(r.dailyLoss?.value).toBe(600);
    expect(r.dailyLoss?.state).toBe('ok');
  });

  it('passe en danger près de la limite', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [t('2026-01-05', -850)], '2026-01-05');
    expect(r.dailyLoss?.state).toBe('danger');
  });

  it('échoue à la limite', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [t('2026-01-05', -1_000)], '2026-01-05');
    expect(r.status).toBe('failed');
    expect(r.reasons).toContain('daily_loss_breached');
  });

  it('ne compte pas les jours précédents', () => {
    const r = evaluateFuturesAccount(
      TOPSTEP_50K,
      50_000,
      [t('2026-01-05', -900), t('2026-01-06', -100)],
      '2026-01-06',
    );
    expect(r.dailyLoss?.value).toBe(900);
  });
});

describe('cohérence', () => {
  it('accepte un profit réparti', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [
      t('2026-01-05', 1_000),
      t('2026-01-06', 1_000),
      t('2026-01-07', 1_000),
    ]);
    expect(r.consistency?.state).toBe('ok');
  });

  it('signale un jour dominant', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [
      t('2026-01-05', 2_800),
      t('2026-01-06', 200),
    ]);
    expect(r.consistency?.state).toBe('warning');
    expect(r.reasons).toContain('consistency_breached');
  });
});

describe('passage du challenge', () => {
  it('passe si objectif + jours + cohérence', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [
      t('2026-01-05', 1_500),
      t('2026-01-06', 1_500),
    ]);
    expect(r.canPass).toBe(true);
    expect(r.status).toBe('passed');
  });

  it('ne passe pas sans le minimum de jours', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [t('2026-01-05', 3_000)]);
    expect(r.canPass).toBe(false);
    expect(r.reasons).toContain('min_days_not_met');
  });

  it('échoue si drawdown cassé', () => {
    const r = evaluateFuturesAccount(TOPSTEP_50K, 50_000, [
      t('2026-01-05', -900),
      t('2026-01-06', -900),
      t('2026-01-07', -300),
    ]);
    expect(r.balance).toBe(47_900);
    expect(r.status).toBe('failed');
  });
});

describe('compte direct', () => {
  it('gère profitTarget null', () => {
    const direct: OfferRules = { ...TOPSTEP_50K, profitTarget: null, minTradingDays: 1 };
    const r = evaluateFuturesAccount(direct, 50_000, [t('2026-01-05', 500)]);
    expect(r.profitTarget).toBeNull();
  });
});

describe('objectif net de commissions (bug de règle)', () => {
  // Apex documente que l'objectif est NET de commissions. Le moteur doit calculer
  // la progression sur pnl − fees, jamais sur le brut, sinon il annonce un objectif
  // atteint qui ne l'est pas.
  const tf = (date: string, pnl: number, fees: number, id = `${date}-${pnl}`): Trade => ({
    id,
    tradeDate: date,
    closedAt: `${date}T15:30:00Z`,
    pnl,
    fees,
  });

  it('brut au-dessus de l’objectif mais net en dessous → non atteint', () => {
    // Relevé réel : brut 291.50, frais 14.56, net 276.94. Objectif 280.
    const rules: OfferRules = { ...TOPSTEP_50K, profitTarget: 280, minTradingDays: 1 };
    const r = evaluateFuturesAccount(rules, 50_000, [tf('2026-01-05', 291.5, 14.56)]);
    expect(r.netProfit).toBe(276.94); // net, pas 291.50
    expect(r.balance).toBe(50_276.94);
    expect(r.profitTarget?.value).toBe(276.94);
    expect(r.profitTarget?.ratio).toBeLessThan(1);
    expect(r.profitTarget?.state).not.toBe('passed');
    expect(r.canPass).toBe(false);
  });

  it('les frais réduisent la progression vers l’objectif', () => {
    const rules: OfferRules = { ...TOPSTEP_50K, profitTarget: 3_000, minTradingDays: 1 };
    const brut = evaluateFuturesAccount(rules, 50_000, [t('2026-01-05', 3_100)]);
    const net = evaluateFuturesAccount(rules, 50_000, [tf('2026-01-05', 3_100, 300)]);
    expect(brut.profitTarget?.state).toBe('passed'); // 3100 ≥ 3000
    expect(net.profitTarget?.state).not.toBe('passed'); // 2800 < 3000
    expect(net.profitTarget?.value).toBe(2_800);
  });
});

/* =====================================================================
   PAYOUTS — le calcul que les comparateurs documentent sans l'exécuter
   ===================================================================== */

/** Lucid Flex 50k : 5 jours de profit à $150, 50% du profit, max $2000. */
const LUCID_FLEX_50K: PayoutRules = {
  buffer: null,
  minAmount: 500,
  minProfitDays: 5,
  dailyThreshold: 150,
  consistencyPct: null,
  minCycleProfit: null,
  maxAmount: 2_000,
  maxPct: 50,
};

/** Lucid Pro 50k : buffer $52 100, cohérence 40%, profit min $500. */
const LUCID_PRO_50K: PayoutRules = {
  buffer: 52_100,
  minAmount: 500,
  minProfitDays: null,
  dailyThreshold: null,
  consistencyPct: 40,
  minCycleProfit: 500,
  maxAmount: 2_500,
  maxPct: null,
};

describe('payout — jours de profit', () => {
  it('bloque si pas assez de jours au seuil', () => {
    const trades = [
      t('2026-02-02', 200),
      t('2026-02-03', 200),
      t('2026-02-04', 100), // sous le seuil de 150 → ne compte pas
    ];
    const r = evaluatePayout(LUCID_FLEX_50K, 50_000, 50_500, trades);
    expect(r.profitDays.count).toBe(2);
    expect(r.missing.profitDays).toBe(3);
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain('profit_days_not_met');
  });

  it('valide avec 5 jours au-dessus du seuil', () => {
    const trades = [
      t('2026-02-02', 200),
      t('2026-02-03', 200),
      t('2026-02-04', 200),
      t('2026-02-05', 200),
      t('2026-02-06', 200),
    ];
    const r = evaluatePayout(LUCID_FLEX_50K, 50_000, 51_000, trades);
    expect(r.profitDays.met).toBe(true);
    expect(r.eligible).toBe(true);
    // 50% de 1000 = 500, sous le plafond de 2000
    expect(r.withdrawable).toBe(500);
  });
});

describe('payout — sans buffer', () => {
  const NO_BUFFER: PayoutRules = {
    buffer: null,
    minAmount: null,
    minProfitDays: null,
    dailyThreshold: null,
    consistencyPct: null,
    minCycleProfit: null,
    maxAmount: null,
    maxPct: null,
  };

  it('retirable = profit du cycle, jamais le solde entier', () => {
    // Bug réel : sur 50 000 avec 531,02 de profit, retirable ≈ 531, pas 50 531.
    const r = evaluatePayout(NO_BUFFER, 50_000, 50_531.02, [t('2026-02-02', 531.02)]);
    expect(r.withdrawable).toBe(531.02);
  });

  it('rien à retirer si le compte est sous le capital initial', () => {
    const r = evaluatePayout(NO_BUFFER, 50_000, 49_800, [t('2026-02-02', -200)]);
    expect(r.withdrawable).toBe(0);
  });
});

describe('payout — buffer', () => {
  it('bloque sous le buffer et chiffre l’écart', () => {
    const r = evaluatePayout(LUCID_PRO_50K, 50_000, 51_800, [t('2026-02-02', 1_800)]);
    expect(r.bufferGap).toBe(300);
    expect(r.blockers).toContain('below_buffer');
    expect(r.eligible).toBe(false);
  });

  it('ne retire que ce qui dépasse le buffer', () => {
    // Profit réparti sur 3 jours pour respecter la cohérence 40%
    const r = evaluatePayout(LUCID_PRO_50K, 50_000, 53_000, [
      t('2026-02-02', 1_000),
      t('2026-02-03', 1_000),
      t('2026-02-04', 1_000),
    ]);
    // 53000 - 52100 = 900
    expect(r.withdrawable).toBe(900);
    expect(r.eligible).toBe(true);
  });
});

describe('payout — cohérence funded', () => {
  it('bloque si un jour dépasse la cohérence', () => {
    const r = evaluatePayout(LUCID_PRO_50K, 50_000, 53_000, [
      t('2026-02-02', 2_800),
      t('2026-02-03', 200),
    ]);
    expect(r.consistency?.state).toBe('warning');
    expect(r.blockers).toContain('consistency_breached');
    expect(r.eligible).toBe(false);
  });
});

describe('payout — objectif de cycle', () => {
  it('chiffre ce qu’il manque', () => {
    const r = evaluatePayout(LUCID_PRO_50K, 50_000, 50_300, [t('2026-02-02', 300)]);
    expect(r.missing.cycleProfit).toBe(200); // 500 requis - 300 réalisés
    expect(r.blockers).toContain('cycle_profit_not_met');
  });
});

describe('payout — plafonds', () => {
  it('applique le plafond en montant', () => {
    const trades = [
      t('2026-02-02', 2_000),
      t('2026-02-03', 2_000),
      t('2026-02-04', 2_000),
      t('2026-02-05', 2_000),
      t('2026-02-06', 2_000),
    ];
    const r = evaluatePayout(LUCID_FLEX_50K, 50_000, 60_000, trades);
    // 50% de 10000 = 5000, mais plafonné à 2000
    expect(r.withdrawable).toBe(2_000);
  });
});
