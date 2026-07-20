import type { RuleState } from '@/lib/rules/types';
import { STATUS_LABELS } from '@/lib/journal/snapshot';

/** Couleur d'état — jamais l'accent de marque, la lisibilité du risque prime. */
export function stateColor(state: RuleState): string {
  switch (state) {
    case 'ok':
    case 'passed':
      return 'var(--lime)';
    case 'warning':
      return 'var(--amber)';
    case 'danger':
    case 'failed':
      return 'var(--red)';
  }
}

export function money(value: number, currency = 'USD'): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;
}

/** Montant signé (+/−) pour un P&L. */
export function signed(value: number, currency = 'USD'): string {
  const s = value >= 0 ? '+' : '−';
  return `${s}${Math.abs(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;
}

export function StatusBadge({ state }: { state: RuleState }) {
  return (
    <span
      className="jbadge"
      style={{ color: stateColor(state), borderColor: stateColor(state) }}
    >
      {STATUS_LABELS[state]}
    </span>
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
