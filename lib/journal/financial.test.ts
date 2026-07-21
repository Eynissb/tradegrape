import { describe, expect, it } from 'vitest';
import {
  buildFinancialBalance,
  type FinAccount,
  type FinPayout,
  type FinPurchase,
} from './financial';

const accounts: FinAccount[] = [
  { id: 'a', status: 'passed', firmName: 'Apex' }, // financé, a rapporté
  { id: 'b', status: 'failed', firmName: 'Apex' }, // échoué
  { id: 'c', status: 'evaluation', firmName: 'Topstep' }, // en cours
  { id: 'd', status: 'funded', firmName: 'Topstep' }, // financé
];

const purchases: FinPurchase[] = [
  { accountId: 'a', kind: 'challenge', amount: 150, purchasedAt: '2026-01-01' },
  { accountId: 'a', kind: 'activation', amount: 130, purchasedAt: '2026-02-01' },
  { accountId: 'b', kind: 'challenge', amount: 150, purchasedAt: '2026-01-05' },
  { accountId: 'b', kind: 'reset', amount: 50, purchasedAt: '2026-01-20' },
  { accountId: 'c', kind: 'challenge', amount: 165, purchasedAt: '2026-03-01' },
  { accountId: 'd', kind: 'challenge', amount: 165, purchasedAt: '2026-01-10' },
];

const payouts: FinPayout[] = [
  { accountId: 'a', amount: 900, receivedAt: '2026-02-15' }, // reçu
  { accountId: 'd', amount: 500, receivedAt: null }, // demandé, pas encore reçu
];

describe('buildFinancialBalance', () => {
  const b = buildFinancialBalance({ accounts, purchases, payouts });

  it('total dépensé et ventilation par type', () => {
    expect(b.spentByKind).toEqual({ challenge: 630, reset: 50, activation: 130 });
    expect(b.totalSpent).toBe(810);
  });

  it('compte les statuts', () => {
    expect(b.accountsTotal).toBe(4);
    expect(b.active).toBe(2); // evaluation + funded
    expect(b.passed).toBe(1);
    expect(b.failed).toBe(1);
    expect(b.fundedReached).toBe(2); // funded + passed
  });

  it('payouts reçus, résultat net', () => {
    expect(b.payoutsReceived).toBe(900); // le payout non reçu (d) est exclu
    expect(b.netResult).toBe(90); // 900 - 810
  });

  it('taux de réussite = financés / (financés + échoués)', () => {
    expect(b.successRate).toBeCloseTo(66.67, 1);
    expect(b.avgCostPerFunded).toBe(405); // 810 / 2
  });

  it('délai moyen jusqu’au premier payout', () => {
    // compte a : premier achat 2026-01-01, premier payout reçu 2026-02-15 = 45 jours
    expect(b.avgDaysToFirstPayout).toBe(45);
  });

  it('répartition par firm triée par net', () => {
    const apex = b.byFirm.find((f) => f.firm === 'Apex');
    const topstep = b.byFirm.find((f) => f.firm === 'Topstep');
    expect(apex).toMatchObject({ accounts: 2, spent: 480, payouts: 900, net: 420 });
    expect(topstep).toMatchObject({ accounts: 2, spent: 330, payouts: 0, net: -330 });
    expect(b.byFirm[0].firm).toBe('Apex'); // net le plus haut en tête
  });

  it('vide → tout à zéro / null', () => {
    const e = buildFinancialBalance({ accounts: [], purchases: [], payouts: [] });
    expect(e.totalSpent).toBe(0);
    expect(e.successRate).toBeNull();
    expect(e.avgCostPerFunded).toBeNull();
    expect(e.avgDaysToFirstPayout).toBeNull();
  });
});
