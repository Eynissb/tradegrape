/**
 * Import/export CSV des trades du journal — fonctions PURES.
 *
 * Un adaptateur par plateforme normalise vers le schéma `trades`. Les en-têtes
 * sont reconnus de façon tolérante (casse et ponctuation ignorées, plusieurs
 * alias par champ) : les exports varient d'une version à l'autre.
 *
 * Contrat : `pnl` = P&L de la plateforme, `fees` = commissions. Le moteur
 * calcule le net = pnl − fees. On ne double-compte jamais les commissions.
 */

import { parseCsv } from '../admin/offer-csv';

export type ImportPlatform = 'tradovate' | 'ninjatrader' | 'rithmic';

export interface NormalizedTrade {
  trade_date: string; // YYYY-MM-DD
  closed_at: string; // ISO
  symbol: string;
  direction: string | null;
  quantity: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number;
  fees: number;
}

export interface ParsedTrade {
  payload: NormalizedTrade;
  errors: string[];
}

interface FieldMap {
  symbol: string[];
  pnl: string[];
  fees?: string[];
  qty?: string[];
  entry?: string[];
  exit?: string[];
  direction?: string[];
  closeTime: string[];
  openTime?: string[];
}

interface Adapter {
  label: string;
  /** En-têtes attendus, montrés à l'utilisateur. */
  expected: string;
  map: FieldMap;
}

const norm = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export const ADAPTERS: Record<ImportPlatform, Adapter> = {
  tradovate: {
    label: 'Tradovate',
    expected: 'symbol, qty, buyPrice, sellPrice, pnl, boughtTimestamp, soldTimestamp',
    map: {
      symbol: ['symbol', 'contract'],
      pnl: ['pnl', 'realizedpnl', 'netpnl', 'pl', 'profit'],
      fees: ['commission', 'commissions', 'fees', 'fee'],
      qty: ['qty', 'quantity', 'filledqty', 'positionqty'],
      entry: ['buyprice', 'entryprice', 'buyfillprice', 'avgentryprice'],
      exit: ['sellprice', 'exitprice', 'sellfillprice', 'avgexitprice'],
      direction: ['side', 'bs', 'buysell', 'direction'],
      closeTime: ['soldtimestamp', 'soldtime', 'exittime', 'closetime', 'timestamp', 'closedat', 'date'],
      openTime: ['boughttimestamp', 'boughttime', 'entrytime', 'opentime'],
    },
  },
  ninjatrader: {
    label: 'NinjaTrader',
    expected: 'Instrument, Market pos., Quantity, Entry price, Exit price, Entry time, Exit time, Profit, Commission',
    map: {
      symbol: ['instrument', 'symbol'],
      pnl: ['profit', 'pnl', 'netprofit', 'pl'],
      fees: ['commission', 'commissions', 'fees'],
      qty: ['quantity', 'qty'],
      entry: ['entryprice'],
      exit: ['exitprice'],
      direction: ['marketpos', 'marketposition', 'position', 'direction'],
      closeTime: ['exittime', 'exitdate', 'closetime'],
      openTime: ['entrytime'],
    },
  },
  rithmic: {
    label: 'Rithmic',
    expected: 'Symbol, Side, Qty, Entry Price, Exit Price, Close Time, P&L, Commission',
    map: {
      symbol: ['symbol', 'instrument', 'ticker'],
      pnl: ['pnl', 'pl', 'netpnl', 'closedpnl', 'profit', 'realizedpnl'],
      fees: ['commission', 'commissions', 'fees'],
      qty: ['qty', 'quantity', 'size'],
      entry: ['entryprice', 'avgentryprice', 'buyprice'],
      exit: ['exitprice', 'avgexitprice', 'sellprice', 'avgfillprice', 'price'],
      direction: ['side', 'buysell', 'position', 'direction'],
      closeTime: ['closetime', 'updatetime', 'exittime', 'time', 'date', 'timestamp'],
      openTime: ['opentime', 'entrytime'],
    },
  },
};

const pad2 = (s: string): string => (s.length === 1 ? `0${s}` : s);

/** Parse un nombre tolérant : symboles monétaires, parenthèses = négatif, séparateurs. */
export function parseNum(raw: string): number | null {
  let s = raw.trim();
  if (s === '') return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$€£\s]/g, '');
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/,/g, ''); // virgules = milliers
  } else if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function iso(y: string, mo: string, d: string, h: string, mi: string, se: string) {
  const date = `${y}-${pad2(mo)}-${pad2(d)}`;
  return { date, iso: `${date}T${pad2(h)}:${pad2(mi)}:${pad2(se)}.000Z` };
}

/** Parse une date/heure tolérante (ISO, US MM/DD/YYYY, date seule). */
export function parseDateTime(raw: string): { iso: string; date: string } | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return iso(m[1], m[2], m[3], m[4], m[5], m[6] ?? '00');

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return iso(m[1], m[2], m[3], '12', '00', '00');

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (m) {
    let hh = m[4] ? Number(m[4]) : 12;
    const ap = m[7]?.toUpperCase();
    if (ap === 'PM' && hh < 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    return iso(m[3], m[1], m[2], String(hh), m[5] ?? '00', m[6] ?? '00');
  }
  return null;
}

function normDirection(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/(^|[^a-z])(long|buy|bought|b)([^a-z]|$)/.test(s) || s === 'l') return 'long';
  if (/(^|[^a-z])(short|sell|sold|s)([^a-z]|$)/.test(s)) return 'short';
  return null;
}

function pick(index: Map<string, number>, cells: string[], aliases?: string[]): string {
  if (!aliases) return '';
  for (const a of aliases) {
    const pos = index.get(a);
    if (pos !== undefined) {
      const v = cells[pos];
      if (v !== undefined && v.trim() !== '') return v;
    }
  }
  return '';
}

const MAX_ROWS = 5000;

/** Parse un export CSV d'une plateforme → trades normalisés + erreurs par ligne. */
export function parseTradesCsv(
  text: string,
  platform: ImportPlatform,
): { trades: ParsedTrade[]; headerError?: string } {
  const adapter = ADAPTERS[platform];
  if (!adapter) return { trades: [], headerError: 'Plateforme inconnue.' };

  const rows = parseCsv(text);
  if (rows.length === 0) return { trades: [], headerError: 'Fichier vide.' };
  if (rows.length - 1 > MAX_ROWS) {
    return { trades: [], headerError: `Trop de lignes (${rows.length - 1} > ${MAX_ROWS}).` };
  }

  const index = new Map<string, number>();
  rows[0].forEach((h, i) => {
    const key = norm(h);
    if (key && !index.has(key)) index.set(key, i);
  });

  // Au moins le symbole et le P&L doivent être identifiables dans l'en-tête.
  const hasSymbol = adapter.map.symbol.some((a) => index.has(a));
  const hasPnl = adapter.map.pnl.some((a) => index.has(a));
  if (!hasSymbol || !hasPnl) {
    return {
      trades: [],
      headerError: `En-tête non reconnu pour ${adapter.label}. Colonnes attendues : ${adapter.expected}.`,
    };
  }

  const trades: ParsedTrade[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const errors: string[] = [];
    const ln = r + 1;

    const symbol = pick(index, cells, adapter.map.symbol).trim();
    if (!symbol) errors.push(`Ligne ${ln} — symbole manquant`);

    const pnl = parseNum(pick(index, cells, adapter.map.pnl));
    if (pnl === null) errors.push(`Ligne ${ln} — P&L manquant ou invalide`);

    const closeRaw = pick(index, cells, adapter.map.closeTime) || pick(index, cells, adapter.map.openTime);
    const dt = parseDateTime(closeRaw);
    if (!dt) errors.push(`Ligne ${ln} — date/heure manquante ou invalide`);

    trades.push({
      payload: {
        trade_date: dt?.date ?? '',
        closed_at: dt?.iso ?? '',
        symbol,
        direction: normDirection(pick(index, cells, adapter.map.direction)),
        quantity: parseNum(pick(index, cells, adapter.map.qty)),
        entry_price: parseNum(pick(index, cells, adapter.map.entry)),
        exit_price: parseNum(pick(index, cells, adapter.map.exit)),
        pnl: pnl ?? 0,
        fees: parseNum(pick(index, cells, adapter.map.fees)) ?? 0,
      },
      errors,
    });
  }

  return { trades };
}

/* --------------------------------- EXPORT --------------------------------- */

const EXPORT_COLUMNS = [
  'trade_date',
  'closed_at',
  'symbol',
  'direction',
  'quantity',
  'entry_price',
  'exit_price',
  'pnl',
  'fees',
  'tags',
  'notes',
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface ExportTradeRow {
  trade_date: string;
  closed_at: string | null;
  symbol: string | null;
  direction: string | null;
  quantity: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  pnl: number | string | null;
  fees: number | string | null;
  tags: string[] | null;
  notes: string | null;
}

/** Sérialise les trades de l'utilisateur en CSV (RGPD / confiance). */
export function tradesToCsv(rows: ExportTradeRow[]): string {
  const out = [EXPORT_COLUMNS.join(',')];
  for (const row of rows) {
    const record = row as unknown as Record<string, unknown>;
    const cells = EXPORT_COLUMNS.map((col) => {
      const raw = record[col];
      if (raw === null || raw === undefined) return '';
      if (col === 'tags') return csvEscape(Array.isArray(raw) ? raw.join(', ') : '');
      return csvEscape(String(raw));
    });
    out.push(cells.join(','));
  }
  return out.join('\r\n');
}
