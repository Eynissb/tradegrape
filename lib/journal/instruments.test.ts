import { describe, expect, it } from 'vitest';
import {
  INSTRUMENTS,
  INSTRUMENT_LIST,
  computeRiskSizing,
  lookupInstrument,
  riskBudget,
} from './instruments';
import type { RuleEvaluation, GaugeResult } from '../rules/types';

/** Jauge minimale pour les tests de budget. */
function gauge(value: number): GaugeResult {
  return { value, limit: 0, ratio: 0, state: 'ok', label: '' };
}
function ev(partial: { drawdown: number; daily: number | null }): RuleEvaluation {
  return {
    balance: 0, netProfit: 0,
    dailyLoss: partial.daily === null ? null : gauge(partial.daily),
    drawdown: gauge(partial.drawdown),
    profitTarget: null, consistency: null,
    tradingDays: { count: 0, required: 0, met: false },
    drawdownFloor: 0, highWaterMark: 0,
    status: 'ok', reasons: [], canPass: true,
  };
}

describe('lookupInstrument', () => {
  it('résout un symbole avec échéance vers sa racine', () => {
    expect(lookupInstrument('MNQU6')?.root).toBe('MNQ');
  });
  it('est insensible à la casse et aux espaces', () => {
    expect(lookupInstrument('  mes ')?.root).toBe('MES');
  });
  it('renvoie null pour un instrument non couvert', () => {
    expect(lookupInstrument('ZB')).toBeNull();
  });
  it('liste les micros avant les minis', () => {
    const firstMini = INSTRUMENT_LIST.findIndex((i) => !i.micro);
    const lastMicro = INSTRUMENT_LIST.map((i) => i.micro).lastIndexOf(true);
    expect(lastMicro).toBeLessThan(firstMini);
  });
});

describe('valeurs de tick (spécifications CME)', () => {
  it('micro vaut un dixième de son mini pour les indices', () => {
    expect(INSTRUMENTS.MES.tickValue).toBe(INSTRUMENTS.ES.tickValue / 10);
    expect(INSTRUMENTS.MNQ.tickValue).toBe(INSTRUMENTS.NQ.tickValue / 10);
    expect(INSTRUMENTS.MGC.tickValue).toBe(INSTRUMENTS.GC.tickValue / 10);
  });
});

describe('riskBudget', () => {
  it('prend le plancher quand il est plus serré que le daily loss', () => {
    expect(riskBudget(ev({ drawdown: 400, daily: 900 }))).toEqual({ amount: 400, limitedBy: 'drawdown' });
  });
  it('prend le daily loss quand il est plus serré', () => {
    expect(riskBudget(ev({ drawdown: 900, daily: 400 }))).toEqual({ amount: 400, limitedBy: 'daily' });
  });
  it('à égalité, nomme le plancher — c’est lui qui fait perdre le compte', () => {
    expect(riskBudget(ev({ drawdown: 500, daily: 500 }))).toEqual({ amount: 500, limitedBy: 'drawdown' });
  });
  it('sans daily loss, seul le plancher borne', () => {
    expect(riskBudget(ev({ drawdown: 750, daily: null }))).toEqual({ amount: 750, limitedBy: 'drawdown' });
  });
  it('ne renvoie jamais de budget négatif', () => {
    expect(riskBudget(ev({ drawdown: -120, daily: 300 })).amount).toBe(0);
  });
});

describe('computeRiskSizing', () => {
  it('donne le nombre max de contrats pour un stop donné', () => {
    // Budget 1 000, MNQ (tick 0,50), stop 40 ticks → 20 $/contrat → 50 contrats.
    const s = computeRiskSizing({ budget: 1_000, tickValue: 0.5, stopTicks: 40 });
    expect(s).toEqual({ riskPerContract: 20, maxContracts: 50, riskAtMax: 1_000 });
  });
  it('arrondit les contrats au plancher (jamais dépasser le budget)', () => {
    // 1 000 / 250 = 4,0 → mais 1 000 / 300 = 3,33 → 3 contrats.
    const s = computeRiskSizing({ budget: 1_000, tickValue: 12.5, stopTicks: 24 });
    // 24 × 12,5 = 300 → floor(1000/300) = 3, risque 900.
    expect(s?.maxContracts).toBe(3);
    expect(s?.riskAtMax).toBe(900);
  });
  it('renvoie zéro contrat quand un seul dépasse déjà le budget', () => {
    const s = computeRiskSizing({ budget: 50, tickValue: 12.5, stopTicks: 24 });
    expect(s?.maxContracts).toBe(0);
    expect(s?.riskAtMax).toBe(0);
  });
  it('renvoie null pour un stop nul ou négatif', () => {
    expect(computeRiskSizing({ budget: 1_000, tickValue: 0.5, stopTicks: 0 })).toBeNull();
  });
});
