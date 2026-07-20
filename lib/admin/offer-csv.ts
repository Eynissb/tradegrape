/**
 * Schéma CSV des offers, partagé par l'export et l'import.
 * Une seule source de vérité pour l'ordre et le typage des colonnes.
 */

type ColKind = 'num' | 'bool' | 'str' | 'enum' | 'arr';

interface Col {
  key: string;
  kind: ColKind;
  required?: boolean;
  enum?: readonly string[];
}

const DRAWDOWN = ['EOD', 'TRAIL', 'STATIC'] as const;
const PAYOUT_MODELS = [
  'fixed_cap',
  'pct_profit',
  'progressive',
  'buffer_then_free',
  'unlimited',
] as const;

export const OFFER_COLUMNS: readonly Col[] = [
  { key: 'account_size', kind: 'num', required: true },
  { key: 'price', kind: 'num', required: true },
  { key: 'price_regular', kind: 'num' },
  { key: 'activation_fee', kind: 'num' },
  { key: 'is_recurring', kind: 'bool' },
  { key: 'currency', kind: 'str' },
  { key: 'vat_included', kind: 'bool' },
  { key: 'drawdown_type', kind: 'enum', required: true, enum: DRAWDOWN },
  { key: 'drawdown_amount', kind: 'num', required: true },
  { key: 'profit_target', kind: 'num' },
  { key: 'daily_loss_limit', kind: 'num' },
  { key: 'consistency_pct', kind: 'num' },
  { key: 'min_trading_days', kind: 'num' },
  { key: 'max_minis', kind: 'num' },
  { key: 'max_micros', kind: 'num' },
  { key: 'funded_drawdown_type', kind: 'enum', enum: DRAWDOWN },
  { key: 'funded_daily_loss', kind: 'num' },
  { key: 'funded_consistency_pct', kind: 'num' },
  { key: 'funded_max_minis', kind: 'num' },
  { key: 'funded_max_micros', kind: 'num' },
  { key: 'profit_split', kind: 'num' },
  { key: 'payout_model', kind: 'enum', enum: PAYOUT_MODELS },
  { key: 'payout_buffer', kind: 'num' },
  { key: 'payout_min_amount', kind: 'num' },
  { key: 'payout_frequency_days', kind: 'num' },
  { key: 'payout_min_days', kind: 'num' },
  { key: 'payout_daily_threshold', kind: 'num' },
  { key: 'payout_method', kind: 'str' },
  { key: 'platforms', kind: 'arr' },
  { key: 'is_published', kind: 'bool' },
];

const HEADER = OFFER_COLUMNS.map((c) => c.key);

/* --------------------------------- EXPORT --------------------------------- */

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellFromOffer(offer: Record<string, unknown>, col: Col): string {
  const raw = offer[col.key];
  if (raw === null || raw === undefined) return '';
  if (col.kind === 'bool') return raw ? 'true' : 'false';
  if (col.kind === 'arr') return Array.isArray(raw) ? raw.join(', ') : '';
  return String(raw);
}

export function offersToCsv(offers: Record<string, unknown>[]): string {
  const lines = [HEADER.join(',')];
  for (const offer of offers) {
    lines.push(OFFER_COLUMNS.map((c) => csvEscape(cellFromOffer(offer, c))).join(','));
  }
  return lines.join('\r\n');
}

/* --------------------------------- IMPORT --------------------------------- */

/** Parseur CSV minimal : gère guillemets, virgules et retours à la ligne échappés. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // BOM éventuel

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const TRUE_SET = new Set(['true', '1', 'yes', 'oui', 'x', 'vrai']);

export interface ParsedOffer {
  payload: Record<string, unknown>;
  errors: string[];
}

function parseCell(col: Col, raw: string): { value: unknown; error?: string } {
  const s = raw.trim();
  if (s === '') {
    if (col.required) return { value: null, error: `${col.key} requis` };
    return { value: col.kind === 'arr' ? [] : null };
  }
  switch (col.kind) {
    case 'num': {
      const n = Number(s.replace(/[\s_]/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return { value: null, error: `${col.key} : nombre invalide « ${s} »` };
      return { value: n };
    }
    case 'bool':
      return { value: TRUE_SET.has(s.toLowerCase()) };
    case 'arr':
      return { value: s.split(',').map((x) => x.trim()).filter(Boolean) };
    case 'enum':
      if (col.enum && !col.enum.includes(s)) {
        return { value: null, error: `${col.key} : « ${s} » hors ${col.enum.join('/')}` };
      }
      return { value: s };
    default:
      return { value: s };
  }
}

/**
 * Transforme les lignes CSV (1re ligne = en-têtes) en payloads offers.
 * Les colonnes inconnues sont ignorées ; les colonnes absentes → valeur par défaut.
 */
export function csvRowsToOffers(rows: string[][]): { offers: ParsedOffer[]; headerError?: string } {
  if (rows.length === 0) return { offers: [], headerError: 'Fichier vide.' };

  const header = rows[0].map((h) => h.trim());
  const index = new Map(header.map((h, i) => [h, i]));

  if (!index.has('account_size')) {
    return { offers: [], headerError: 'Colonne « account_size » manquante dans l’en-tête.' };
  }

  const offers: ParsedOffer[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const payload: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const col of OFFER_COLUMNS) {
      const pos = index.get(col.key);
      const raw = pos === undefined ? '' : (cells[pos] ?? '');
      const { value, error } = parseCell(col, raw);
      if (error) errors.push(`Ligne ${r + 1} — ${error}`);
      // On n'écrit une colonne absente de l'en-tête que si elle est requise (sinon on laisse la valeur DB).
      if (pos !== undefined || col.required) payload[col.key] = value;
    }

    offers.push({ payload, errors });
  }

  return { offers };
}
