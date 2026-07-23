import { describe, expect, it } from 'vitest';
import { buildWeekReview, mondayOf } from './week-review';
import type { AnalyticsTrade } from './analytics';
import type { OfferRules } from '../rules/types';

const RULES: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'STATIC',
  drawdownAmount: 5_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_000,
  consistencyPct: 100,
  minTradingDays: 1,
};

function t(date: string, pnl: number, symbol = 'ES'): AnalyticsTrade {
  return { id: `${date}-${pnl}`, tradeDate: date, closedAt: `${date}T14:00:00.000Z`, pnl, fees: 0, symbol, tags: [] };
}

describe('mondayOf', () => {
  it('un mercredi renvoie le lundi de sa semaine', () => {
    expect(mondayOf('2026-07-22')).toBe('2026-07-20'); // mer 22 → lun 20
  });
  it('un lundi se renvoie lui-même', () => {
    expect(mondayOf('2026-07-20')).toBe('2026-07-20');
  });
  it('un dimanche renvoie le lundi PRÉCÉDENT, pas le suivant', () => {
    expect(mondayOf('2026-07-26')).toBe('2026-07-20'); // dim 26 → lun 20
  });
});

describe('buildWeekReview', () => {
  const trades = [
    t('2026-07-13', 999), // semaine précédente — doit être exclue
    t('2026-07-20', 400), // lundi
    t('2026-07-22', -150), // mercredi
    t('2026-07-24', 250), // vendredi
    t('2026-07-27', 500), // lundi suivant — exclu
  ];

  it('borne la semaine au lundi–dimanche et exclut le reste', () => {
    const w = buildWeekReview(RULES, 50_000, trades, '2026-07-22');
    expect(w.weekStart).toBe('2026-07-20');
    expect(w.weekEnd).toBe('2026-07-26');
    expect(w.entries).toBe(3);
    expect(w.tradingDays).toBe(3);
    expect(w.pnl).toBe(500); // 400 − 150 + 250
  });

  it('identifie meilleur et pire jour de la semaine', () => {
    const w = buildWeekReview(RULES, 50_000, trades, '2026-07-22');
    expect(w.bestDay).toEqual({ date: '2026-07-20', pnl: 400 });
    expect(w.worstDay).toEqual({ date: '2026-07-22', pnl: -150 });
  });

  it('donne les liens de navigation semaine précédente / suivante', () => {
    const w = buildWeekReview(RULES, 50_000, trades, '2026-07-22');
    expect(w.prevWeek).toBe('2026-07-13');
    expect(w.nextWeek).toBe('2026-07-27');
  });

  it('calcule la discipline sur les seuls trades de la semaine', () => {
    // Une brèche du daily loss la semaine précédente ne doit pas peser sur celle-ci.
    const withBreach = [t('2026-07-13', -1_200), t('2026-07-20', 300)];
    const w = buildWeekReview(RULES, 50_000, withBreach, '2026-07-22');
    expect(w.discipline.breached).toBe(0);
    expect(w.discipline.score).toBe(100);
  });

  it('gère une semaine vide sans planter', () => {
    const w = buildWeekReview(RULES, 50_000, [], '2026-07-22');
    expect(w.entries).toBe(0);
    expect(w.bestDay).toBeNull();
    expect(w.discipline.score).toBeNull();
  });
});
