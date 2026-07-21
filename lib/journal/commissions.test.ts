import { describe, expect, it } from 'vitest';
import {
  derivePerContract,
  distributeCommissions,
  feesForTrade,
  summarize,
  totalContracts,
  type CommissionTrade,
} from './commissions';

const trade = (pnl: number, quantity: number | null = 1): CommissionTrade => ({ pnl, quantity });

describe('totalContracts', () => {
  it('somme les quantités, 1 par défaut si absente', () => {
    expect(totalContracts([trade(10, 2), trade(-5, 3), trade(1, null)])).toBe(6);
  });
});

describe('derivePerContract', () => {
  it('total ÷ contrats', () => {
    // Relevé Apex réel : 14.56 de frais sur 4 contrats aller-retour → 3.64.
    expect(derivePerContract(14.56, 4)).toBe(3.64);
  });
  it('0 contrat → 0', () => {
    expect(derivePerContract(10, 0)).toBe(0);
  });
});

describe('feesForTrade', () => {
  it('quantité × commission/contrat', () => {
    expect(feesForTrade(3, 3.64)).toBe(10.92);
    expect(feesForTrade(null, 3.64)).toBe(3.64);
  });
});

describe('summarize', () => {
  it('retombe sur le net de la plateforme', () => {
    // Relevé réel : brut 291.50, commissions 14.56, net 276.94.
    const trades = [trade(200, 2), trade(91.5, 2)];
    const s = summarize(trades, 14.56);
    expect(s.grossPnl).toBe(291.5);
    expect(s.commissions).toBe(14.56);
    expect(s.netPnl).toBe(276.94);
    expect(s.contracts).toBe(4);
  });
});

describe('distributeCommissions', () => {
  it('la somme des frais == total exact (au centime)', () => {
    const trades = [trade(200, 2), trade(91.5, 2)];
    const fees = distributeCommissions(14.56, trades);
    expect(fees.reduce((a, b) => a + b, 0)).toBeCloseTo(14.56, 10);
    // pondéré par contrats : 2 et 2 → 7.28 chacun
    expect(fees).toEqual([7.28, 7.28]);
  });

  it('gère un reliquat de centimes non divisible', () => {
    const trades = [trade(10, 1), trade(10, 1), trade(10, 1)];
    const fees = distributeCommissions(10, trades); // 10 / 3 = 3.333…
    expect(fees.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 10);
    // 3.34 + 3.33 + 3.33 = 10.00
    expect(fees.filter((f) => f === 3.34)).toHaveLength(1);
  });

  it('pondère par le nombre de contrats', () => {
    const trades = [trade(0, 3), trade(0, 1)]; // 3:1
    const fees = distributeCommissions(16, trades);
    expect(fees.reduce((a, b) => a + b, 0)).toBeCloseTo(16, 10);
    expect(fees[0]).toBeCloseTo(12, 2);
    expect(fees[1]).toBeCloseTo(4, 2);
  });

  it('lot vide → aucune répartition', () => {
    expect(distributeCommissions(10, [])).toEqual([]);
  });
});
