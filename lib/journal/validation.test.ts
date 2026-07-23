import { describe, expect, it } from 'vitest';
import { buildValidationSummary } from './validation';
import { evaluateAccount } from '../rules/futures-engine';
import type { OfferRules, Trade } from '../rules/types';

const RULES: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'STATIC',
  drawdownAmount: 2_000,
  profitTarget: 3_000,
  dailyLossLimit: 1_000,
  consistencyPct: 100, // désactivée : on isole objectif + jours
  minTradingDays: 3,
};

function t(date: string, pnl: number): Trade {
  return { id: `${date}-${pnl}`, tradeDate: date, closedAt: `${date}T14:00:00.000Z`, pnl, fees: 0 };
}

const summary = (trades: Trade[], rules = RULES, today?: string) =>
  buildValidationSummary(evaluateAccount(rules, 50_000, trades, today));

describe('buildValidationSummary', () => {
  it('en cours : détaille profit et jours restants', () => {
    // +1 000 sur 3 000, 1 jour tradé sur 3 requis.
    const s = summary([t('2026-01-01', 1_000)]);
    expect(s.state).toBe('in_progress');
    expect(s.missing.profit).toBe(2_000);
    expect(s.missing.tradingDays).toBe(2);
    expect(s.missing.consistency).toBe(false);
  });

  it('validé quand objectif ET jours minimum sont atteints', () => {
    const s = summary([t('2026-01-01', 1_000), t('2026-01-02', 1_000), t('2026-01-03', 1_100)]);
    expect(s.state).toBe('validated');
    expect(s.missing.profit).toBe(0);
    expect(s.missing.tradingDays).toBe(0);
  });

  it('en cours si l’objectif est atteint mais pas les jours minimum', () => {
    // +3 200 en 2 jours seulement (min 3).
    const s = summary([t('2026-01-01', 1_600), t('2026-01-02', 1_600)]);
    expect(s.state).toBe('in_progress');
    expect(s.missing.profit).toBe(0);
    expect(s.missing.tradingDays).toBe(1);
  });

  it('en défaut quand le daily loss est dépassé — pas de trajectoire', () => {
    // Le daily loss ne s'évalue que sur le jour de référence : on le pose sur
    // le jour de la brèche.
    const s = summary([t('2026-01-01', -1_200)], RULES, '2026-01-01');
    expect(s.state).toBe('failed');
    expect(s.failedReasons).toContain('daily_loss_breached');
    expect(s.missing).toEqual({ profit: 0, tradingDays: 0, consistency: false });
  });

  it('en défaut quand le plancher de drawdown est touché', () => {
    // Perte cumulée qui passe sous 50 000 − 2 000 = 48 000, sans dépasser le daily loss.
    const s = summary([
      t('2026-01-01', -900),
      t('2026-01-02', -900),
      t('2026-01-03', -300),
    ]);
    expect(s.state).toBe('failed');
    expect(s.failedReasons).toContain('drawdown_breached');
  });

  it('signale la cohérence comme frein à la validation', () => {
    // Objectif atteint, jours OK, mais un jour pèse trop → cohérence bloque canPass.
    const rules = { ...RULES, consistencyPct: 50 };
    const s = summary(
      [t('2026-01-01', 200), t('2026-01-02', 200), t('2026-01-03', 2_700)],
      rules,
    );
    expect(s.state).toBe('in_progress');
    expect(s.missing.consistency).toBe(true);
  });
});
