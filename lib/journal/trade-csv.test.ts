import { describe, expect, it } from 'vitest';
import { parseDateTime, parseNum, parseTradesCsv, tradesToCsv } from './trade-csv';

describe('parseNum', () => {
  it('gère symboles, milliers et parenthèses négatives', () => {
    expect(parseNum('$1,234.50')).toBe(1234.5);
    expect(parseNum('(120.00)')).toBe(-120);
    expect(parseNum('-45')).toBe(-45);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
  });
  it('virgule décimale européenne', () => {
    expect(parseNum('12,5')).toBe(12.5);
  });
});

describe('parseDateTime', () => {
  it('ISO', () => {
    expect(parseDateTime('2026-07-20T14:30:05')).toEqual({ date: '2026-07-20', iso: '2026-07-20T14:30:05.000Z' });
  });
  it('US MM/DD/YYYY HH:MM:SS', () => {
    expect(parseDateTime('07/20/2026 14:30:00')).toEqual({ date: '2026-07-20', iso: '2026-07-20T14:30:00.000Z' });
  });
  it('US avec AM/PM', () => {
    expect(parseDateTime('07/20/2026 2:30 PM')).toEqual({ date: '2026-07-20', iso: '2026-07-20T14:30:00.000Z' });
    expect(parseDateTime('07/20/2026 12:00 AM')).toEqual({ date: '2026-07-20', iso: '2026-07-20T00:00:00.000Z' });
  });
  it('date seule → midi', () => {
    expect(parseDateTime('2026-07-20')).toEqual({ date: '2026-07-20', iso: '2026-07-20T12:00:00.000Z' });
  });
  it('invalide', () => {
    expect(parseDateTime('n/a')).toBeNull();
  });
});

describe('parseTradesCsv — Tradovate', () => {
  const csv = [
    'symbol,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp',
    'ES,2,5000.25,5010.50,410.00,07/20/2026 09:31:00,07/20/2026 09:45:00',
    'NQ,1,18000,17950,($100.00),07/20/2026 10:00:00,07/20/2026 10:05:00',
  ].join('\n');

  it('normalise symbole, P&L, date et prix', () => {
    const { trades, headerError } = parseTradesCsv(csv, 'tradovate');
    expect(headerError).toBeUndefined();
    expect(trades).toHaveLength(2);
    expect(trades[0].errors).toEqual([]);
    expect(trades[0].payload.symbol).toBe('ES');
    expect(trades[0].payload.pnl).toBe(410);
    expect(trades[0].payload.trade_date).toBe('2026-07-20');
    expect(trades[0].payload.closed_at).toBe('2026-07-20T09:45:00.000Z');
    expect(trades[0].payload.entry_price).toBe(5000.25);
    expect(trades[1].payload.pnl).toBe(-100); // parenthèses = négatif
  });
});

describe('parseTradesCsv — NinjaTrader', () => {
  const csv = [
    'Instrument,Market pos.,Quantity,Entry price,Exit price,Entry time,Exit time,Profit,Commission',
    'MES,Long,4,5000,5005,2026-07-20 09:30:00,2026-07-20 09:40:00,250,8',
    'MNQ,Short,2,18000,18010,2026-07-20 10:00:00,2026-07-20 10:03:00,-100,4',
  ].join('\n');

  it('mappe Instrument/Profit/Commission et le sens', () => {
    const { trades, headerError } = parseTradesCsv(csv, 'ninjatrader');
    expect(headerError).toBeUndefined();
    expect(trades[0].payload.symbol).toBe('MES');
    expect(trades[0].payload.direction).toBe('long');
    expect(trades[0].payload.pnl).toBe(250);
    expect(trades[0].payload.fees).toBe(8);
    expect(trades[1].payload.direction).toBe('short');
  });
});

describe('parseTradesCsv — en-tête non reconnu', () => {
  it('renvoie une headerError explicite', () => {
    const { headerError } = parseTradesCsv('a,b,c\n1,2,3', 'tradovate');
    expect(headerError).toContain('Tradovate');
  });
});

describe('parseTradesCsv — lignes invalides', () => {
  it('remonte les erreurs par ligne sans planter', () => {
    const csv = ['symbol,pnl,soldTimestamp', ',410,07/20/2026 09:45:00', 'ES,,07/20/2026 09:45:00', 'NQ,120,pas une date'].join('\n');
    const { trades } = parseTradesCsv(csv, 'tradovate');
    expect(trades[0].errors[0]).toContain('symbole manquant');
    expect(trades[1].errors[0]).toContain('P&L');
    expect(trades[2].errors[0]).toContain('date');
  });
});

describe('tradesToCsv', () => {
  it('sérialise avec en-tête et échappement', () => {
    const csv = tradesToCsv([
      {
        trade_date: '2026-07-20',
        closed_at: '2026-07-20T09:45:00.000Z',
        symbol: 'ES',
        direction: 'long',
        quantity: 2,
        entry_price: 5000,
        exit_price: 5010,
        pnl: 410,
        fees: 4,
        tags: ['setup:breakout'],
        notes: 'bon trade, propre',
      },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('trade_date,closed_at,symbol,direction,quantity,entry_price,exit_price,pnl,fees,tags,notes');
    expect(lines[1]).toContain('ES');
    expect(lines[1]).toContain('setup:breakout');
  });
});
