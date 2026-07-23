import { describe, expect, it } from 'vitest';
import { phaseOfStatus, rulesForPhase, rulesForStatus, fundedRulesDiffer } from './phase';
import { computeDrawdownFloor, evaluateAccount } from './futures-engine';
import type { OfferRules, Trade } from './types';

/** Take Profit Trader : EOD en évaluation, trailing intraday une fois financé. */
const TPT_50K: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'EOD',
  drawdownAmount: 2_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_200,
  consistencyPct: 100,
  minTradingDays: 5,
  fundedDrawdownType: 'TRAIL',
  fundedDailyLossLimit: 800,
};

function t(date: string, pnl: number, hour = '14'): Trade {
  return { id: `${date}-${pnl}-${hour}`, tradeDate: date, closedAt: `${date}T${hour}:00:00.000Z`, pnl, fees: 0 };
}

describe('phaseOfStatus', () => {
  it('seul « funded » bascule sur les règles durcies', () => {
    expect(phaseOfStatus('funded')).toBe('funded');
    expect(phaseOfStatus('evaluation')).toBe('evaluation');
    // « passed » = éval réussie mais pas encore financée.
    expect(phaseOfStatus('passed')).toBe('evaluation');
    expect(phaseOfStatus('failed')).toBe('evaluation');
    expect(phaseOfStatus(null)).toBe('evaluation');
  });
});

describe('rulesForPhase', () => {
  it('en évaluation, renvoie les règles inchangées', () => {
    expect(rulesForPhase(TPT_50K, 'evaluation')).toBe(TPT_50K);
    expect(rulesForPhase(TPT_50K, 'evaluation').drawdownType).toBe('EOD');
  });

  it('en financé, applique le drawdown ET le daily loss durcis', () => {
    const f = rulesForPhase(TPT_50K, 'funded');
    expect(f.drawdownType).toBe('TRAIL');
    expect(f.dailyLossLimit).toBe(800);
    // Le reste est préservé.
    expect(f.drawdownAmount).toBe(2_000);
    expect(f.minTradingDays).toBe(5);
  });

  it('sans variante funded, les règles sont identiques (même référence)', () => {
    const plain: OfferRules = { ...TPT_50K, fundedDrawdownType: null, fundedDailyLossLimit: null };
    expect(rulesForPhase(plain, 'funded')).toBe(plain);
    expect(fundedRulesDiffer(plain)).toBe(false);
  });

  it('un snapshot ANCIEN (sans les champs funded) reste évalué sans casser', () => {
    const legacy = {
      marketType: 'futures',
      accountSize: 50_000,
      drawdownType: 'EOD',
      drawdownAmount: 2_000,
      profitTarget: 3_000,
      dailyLossLimit: 1_200,
      consistencyPct: 100,
      minTradingDays: 5,
    } as OfferRules;
    expect(rulesForPhase(legacy, 'funded')).toBe(legacy);
    expect(rulesForPhase(legacy, 'funded').drawdownType).toBe('EOD');
  });

  it('une seule variante renseignée n’écrase que celle-là', () => {
    const onlyDd: OfferRules = { ...TPT_50K, fundedDailyLossLimit: null };
    const f = rulesForPhase(onlyDd, 'funded');
    expect(f.drawdownType).toBe('TRAIL');
    expect(f.dailyLossLimit).toBe(1_200); // inchangé
  });

  it('rulesForStatus enchaîne statut → phase → règles', () => {
    expect(rulesForStatus(TPT_50K, 'funded').drawdownType).toBe('TRAIL');
    expect(rulesForStatus(TPT_50K, 'evaluation').drawdownType).toBe('EOD');
  });
});

describe('impact réel sur le plancher — le bug corrigé', () => {
  /* Journée qui monte à +1500 intraday puis retombe à +200 en clôture.
     EOD ne retient que la clôture (+200) ; TRAIL retient le pic (+1500).
     C'est exactement l'écart qui piège les comptes financés. */
  const trades = [t('2026-03-02', 1_500, '10'), t('2026-03-02', -1_300, '16')];

  it('le plancher financé est PLUS HAUT que le plancher d’évaluation', () => {
    const evalFloor = computeDrawdownFloor(rulesForPhase(TPT_50K, 'evaluation'), 50_000, trades).floor;
    const fundedFloor = computeDrawdownFloor(rulesForPhase(TPT_50K, 'funded'), 50_000, trades).floor;

    expect(evalFloor).toBe(48_200); // EOD : plus haut de CLÔTURE 50 200 - 2 000
    expect(fundedFloor).toBe(49_500); // TRAIL : pic INTRADAY 51 500 - 2 000
    expect(fundedFloor).toBeGreaterThan(evalFloor);
  });

  it('la marge affichée en financé est réduite de l’écart de plancher', () => {
    const asEval = evaluateAccount(rulesForPhase(TPT_50K, 'evaluation'), 50_000, trades, '2026-03-02');
    const asFunded = evaluateAccount(rulesForPhase(TPT_50K, 'funded'), 50_000, trades, '2026-03-02');

    // Solde identique (50 200), mais la marge avant plancher n'est pas la même.
    expect(asEval.balance).toBe(asFunded.balance);
    expect(asEval.drawdown.value).toBe(2_000); // 50 200 - 48 200
    expect(asFunded.drawdown.value).toBe(700); // 50 200 - 49 500
    // Près de 3× moins de marge affichée — l'écart que le bug masquait.
    expect(asFunded.drawdown.value).toBeLessThan(asEval.drawdown.value);
  });

  it('le daily loss durci resserre aussi la jauge', () => {
    const day = [t('2026-03-03', -600)];
    const asEval = evaluateAccount(rulesForPhase(TPT_50K, 'evaluation'), 50_000, day, '2026-03-03');
    const asFunded = evaluateAccount(rulesForPhase(TPT_50K, 'funded'), 50_000, day, '2026-03-03');

    expect(asEval.dailyLoss?.value).toBe(600); // 1200 - 600
    expect(asFunded.dailyLoss?.value).toBe(200); // 800 - 600
  });

  it('un compte financé peut être PERDU là où l’évaluation le croyait vivant', () => {
    // Pic à +1500 → plancher trailing 49 500. Puis on redescend à 49 400.
    const losing = [t('2026-03-02', 1_500, '10'), t('2026-03-02', -2_100, '16')];

    const asEval = evaluateAccount(rulesForPhase(TPT_50K, 'evaluation'), 50_000, losing, '2026-03-02');
    const asFunded = evaluateAccount(rulesForPhase(TPT_50K, 'funded'), 50_000, losing, '2026-03-02');

    expect(asFunded.balance).toBe(49_400);
    expect(asFunded.drawdown.state).toBe('failed');
    expect(asFunded.reasons).toContain('drawdown_breached');
    // Avec les règles d'évaluation, le plancher EOD est à 48 000 : compte encore vivant.
    expect(asEval.drawdown.state).not.toBe('failed');
  });
});
