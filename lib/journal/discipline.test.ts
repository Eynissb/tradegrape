import { describe, expect, it } from 'vitest';
import { computeDiscipline } from './discipline';
import type { OfferRules, Trade } from '../rules/types';

const RULES: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'STATIC',
  drawdownAmount: 5_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_000,
  consistencyPct: 50,
  minTradingDays: 1,
};

function t(date: string, pnl: number): Trade {
  return { id: `${date}-${pnl}`, tradeDate: date, closedAt: `${date}T14:00:00.000Z`, pnl, fees: 0 };
}

/* La cohérence du moteur se mesure sur les jours GAGNANTS bruts : un seul jour
   gagnant en fait 100 % → alerte. Pour isoler le signal daily loss, les jours
   gagnants sont donc ÉQUILIBRÉS (deux jours à +500 → aucun ne domine, cohérence
   OK). C'est le comportement correct du moteur, pas une astuce de test. */

describe('computeDiscipline', () => {
  it('note null quand aucun jour tradé', () => {
    expect(computeDiscipline(RULES, 50_000, []).score).toBeNull();
  });

  it('donne 100 % quand tous les jours respectent les limites', () => {
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-01', 500), t('2026-01-02', 500), t('2026-01-03', -200)]);
    expect(d.tradingDays).toBe(3);
    expect(d.disciplinedDays).toBe(3);
    expect(d.overSized).toBe(0);
    expect(d.score).toBe(100);
  });

  it('compte un jour ayant dépassé le daily loss comme une entorse', () => {
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-01', 500), t('2026-01-02', 500), t('2026-01-03', -1_200)]);
    expect(d.breached).toBe(1);
    expect(d.overSized).toBe(0);
    expect(d.disciplinedDays).toBe(2);
    expect(d.score).toBe(67);
  });

  it('compte un jour ayant approché le daily loss (seuil 80 %)', () => {
    // -850 sur 1 000 → approché ; les deux gains équilibrés ne cassent rien.
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-01', 500), t('2026-01-02', 500), t('2026-01-03', -850)]);
    expect(d.approached).toBe(1);
    expect(d.breached).toBe(0);
    expect(d.disciplinedDays).toBe(2);
  });

  it('compte le jour qui casse la cohérence comme une entorse', () => {
    // Un jour gagnant pèse > 50 % du gain brut → cohérence en alerte, sur-sizing.
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-01', 100), t('2026-01-02', 100), t('2026-01-03', 2_000)]);
    expect(d.overSized).toBe(1);
    expect(d.disciplinedDays).toBe(2);
    expect(d.days.find((x) => x.date === '2026-01-03')?.disciplined).toBe(false);
  });

  it('inclut le jour cassant la cohérence même sur un compte net perdant', () => {
    // Un seul jour gagnant = 100 % du gain brut, quel que soit le total net.
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-01', 200), t('2026-01-02', -1_200)]);
    expect(d.overSized).toBe(1); // le jour à +200 concentre tout le gain
    expect(d.breached).toBe(1); // le jour à -1 200
    expect(d.disciplinedDays).toBe(0);
  });

  it('renvoie le détail trié par date', () => {
    const d = computeDiscipline(RULES, 50_000, [t('2026-01-03', 300), t('2026-01-01', 300)]);
    expect(d.days.map((x) => x.date)).toEqual(['2026-01-01', '2026-01-03']);
  });
});
