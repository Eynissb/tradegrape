import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import type { RuleState } from '@/lib/rules/types';
import { STATUS_LABELS } from '@/lib/journal/snapshot';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';

/** Couleur d'état — jamais l'accent de marque, la lisibilité du risque prime. */
export function stateColor(state: RuleState): string {
  switch (state) {
    case 'ok':
    case 'passed':
      return 'var(--ok)';
    case 'warning':
      return 'var(--warn)';
    case 'danger':
    case 'failed':
      return 'var(--danger)';
  }
}

/** Couleur d'un P&L : suit le SIGNE, jamais le statut de la règle. */
/**
 * Nombre abrégé pour les axes et graduations (« 12,4 k »). Une seule
 * définition : elle était recopiée à l'identique dans EquityChart,
 * CumulativeChart et analytics-ui.
 */
const compactFmt = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
export function compactNumber(value: number): string {
  return compactFmt.format(value);
}

export function pnlColor(value: number): string {
  return value >= 0 ? 'var(--ok)' : 'var(--danger)';
}

// Montants financiers : TOUJOURS deux décimales. Un arrondi à l'entier fausse la
// marge affichée vs le plancher de drawdown — « 12 USD » au lieu de « 11,50 USD »
// peut décider d'un échec de challenge.
const AMOUNT_FMT = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

export function money(value: number, currency = 'USD'): string {
  return `${value.toLocaleString('fr-FR', AMOUNT_FMT)} ${currency}`;
}

/** Montant signé (+/−) pour un P&L. */
export function signed(value: number, currency = 'USD'): string {
  const s = value >= 0 ? '+' : '−';
  return `${s}${Math.abs(value).toLocaleString('fr-FR', AMOUNT_FMT)} ${currency}`;
}

const STATE_TO_BADGE: Record<RuleState, BadgeVariant> = {
  ok: 'ok',
  passed: 'ok',
  warning: 'warn',
  danger: 'danger',
  failed: 'danger',
};

export function StatusBadge({ state }: { state: RuleState }) {
  const icon =
    state === 'warning' ? TriangleAlert : state === 'danger' || state === 'failed' ? CircleX : CircleCheck;
  return (
    <Badge variant={STATE_TO_BADGE[state]} icon={icon}>
      {STATUS_LABELS[state]}
    </Badge>
  );
}

export function Gauge({
  title,
  valueText,
  ratio,
  state,
  sub,
}: {
  title: string;
  valueText: string;
  ratio: number;
  state: RuleState;
  sub?: string;
}) {
  const color = stateColor(state);
  const width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
  return (
    <div className="jgauge">
      <div className="jgauge-top">
        <span>{title}</span>
        <span className="num" style={{ color }}>
          {valueText}
        </span>
      </div>
      <div className="bar">
        <span style={{ width, background: color }} />
      </div>
      {sub ? <div className="jgauge-sub num">{sub}</div> : null}
    </div>
  );
}
