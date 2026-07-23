import { describe, expect, it } from 'vitest';
import { buildInsights, consistencyBreakerDay, streakEndingAt } from './insights';
import type { OfferRules, Trade } from '../rules/types';

const RULES: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'STATIC',
  drawdownAmount: 2_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_000,
  consistencyPct: 50,
  minTradingDays: 1,
};

function t(date: string, pnl: number): Trade {
  return { id: `${date}-${pnl}`, tradeDate: date, closedAt: `${date}T14:00:00.000Z`, pnl, fees: 0 };
}

const keys = (list: { key: string }[]) => list.map((i) => i.key);

/** `Intl` en fr-FR sépare les milliers par une espace FINE INSÉCABLE (U+202F).
 *  On normalise pour que les assertions restent lisibles en clair. */
const plain = (s: string | undefined) => (s ?? '').replace(/[  ]/g, ' ');

describe('streakEndingAt', () => {
  const m = new Map([
    ['2026-01-01', 100],
    ['2026-01-02', 50],
    ['2026-01-03', 30],
    ['2026-01-04', -20],
  ]);

  it('compte les jours de même signe qui se terminent au jour donné', () => {
    expect(streakEndingAt(m, '2026-01-03')).toEqual({ length: 3, winning: true });
  });

  it('repart à 1 dès que le signe change', () => {
    expect(streakEndingAt(m, '2026-01-04')).toEqual({ length: 1, winning: false });
  });

  it('ignore un jour qui n’est pas le dernier de la fenêtre', () => {
    expect(streakEndingAt(m, '2026-01-02').length).toBe(2);
  });

  it('renvoie zéro sur un jour à P&L nul', () => {
    expect(streakEndingAt(new Map([['2026-01-01', 0]]), '2026-01-01').length).toBe(0);
  });
});

describe('consistencyBreakerDay', () => {
  const m = new Map([
    ['2026-01-01', 200],
    ['2026-01-02', 900],
    ['2026-01-03', -50],
  ]);

  it('désigne le jour gagnant le plus lourd quand la règle est en alerte', () => {
    expect(consistencyBreakerDay(m, 'warning')).toBe('2026-01-02');
  });

  it('ne désigne rien quand la cohérence est respectée', () => {
    expect(consistencyBreakerDay(m, 'ok')).toBeNull();
  });
});

describe('buildInsights', () => {
  const base = { rules: RULES, startingBalance: 50_000, currency: 'USD' };

  it('ne dit rien sur un jour sans entrée', () => {
    expect(buildInsights({ ...base, allTrades: [t('2026-01-01', 100)], day: '2026-01-09' })).toEqual([]);
  });

  it('signale une perte journalière approchée', () => {
    const out = buildInsights({ ...base, allTrades: [t('2026-01-01', -850)], day: '2026-01-01' });
    expect(keys(out)).toContain('daily-loss-approached');
    expect(out.find((i) => i.key === 'daily-loss-approached')?.message).toContain('85 %');
  });

  it('signale une perte journalière dépassée, et en danger', () => {
    const out = buildInsights({ ...base, allTrades: [t('2026-01-01', -1_200)], day: '2026-01-01' });
    const hit = out.find((i) => i.key === 'daily-loss-breached');
    expect(hit?.tone).toBe('danger');
  });

  it('reste muet sur la perte journalière quand elle est loin de la limite', () => {
    const out = buildInsights({ ...base, allTrades: [t('2026-01-01', -100)], day: '2026-01-01' });
    expect(keys(out)).not.toContain('daily-loss-approached');
    expect(keys(out)).not.toContain('daily-loss-breached');
  });

  it('désigne le jour qui casse la cohérence', () => {
    // Un jour pèse largement plus de 50 % du profit total.
    const trades = [t('2026-01-01', 100), t('2026-01-02', 900)];
    const out = buildInsights({ ...base, allTrades: trades, day: '2026-01-02' });
    expect(keys(out)).toContain('consistency-breaker');
  });

  it('n’accuse pas un autre jour que le jour saisi', () => {
    const trades = [t('2026-01-01', 100), t('2026-01-02', 900)];
    const out = buildInsights({ ...base, allTrades: trades, day: '2026-01-01' });
    expect(keys(out)).not.toContain('consistency-breaker');
  });

  it('annonce une série gagnante à partir de trois jours', () => {
    const trades = [t('2026-01-01', 100), t('2026-01-02', 100), t('2026-01-03', 100)];
    const out = buildInsights({ ...base, allTrades: trades, day: '2026-01-03' });
    expect(keys(out)).toContain('streak-win');
  });

  it('donne toujours la marge restante avant le plancher', () => {
    const out = buildInsights({ ...base, allTrades: [t('2026-01-01', -100)], day: '2026-01-01' });
    const room = out.find((i) => i.key === 'drawdown-room');
    // 50 000 − 100 = 49 900, plancher statique à 48 000 → 1 900 de marge.
    expect(plain(room?.message)).toContain('1 900,00 USD');
    expect(plain(room?.message)).toContain('48 000,00 USD');
  });

  it('classe le plus grave en premier et borne la sortie', () => {
    const trades = [t('2026-01-01', 100), t('2026-01-02', 100), t('2026-01-03', -1_200)];
    const out = buildInsights({ ...base, allTrades: trades, day: '2026-01-03', limit: 2 });
    expect(out).toHaveLength(2);
    expect(out[0].tone).toBe('danger');
  });
});
