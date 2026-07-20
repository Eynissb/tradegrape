import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Tone = 'brand' | 'ok' | 'warn' | 'danger';

export interface ProgressProps {
  value: number;
  max: number;
  label: ReactNode;
  labelIcon?: LucideIcon;
  /** Texte formaté à droite, ex "2 080 $ / 3 000 $". */
  display?: ReactNode;
  tone?: Tone | 'auto';
  /** tone="auto" : bascule warn/danger quand la valeur DESCEND sous le seuil. */
  thresholds?: { warn: number; danger: number };
  /** Statut doublé d'une icône + libellé (jamais la couleur seule). */
  status?: { icon?: LucideIcon; label: ReactNode };
}

export function resolveTone(
  value: number,
  tone: Tone | 'auto',
  thresholds?: { warn: number; danger: number },
): Tone {
  if (tone !== 'auto') return tone;
  if (!thresholds) return 'brand';
  if (value <= thresholds.danger) return 'danger';
  if (value <= thresholds.warn) return 'warn';
  return 'ok';
}

export default function Progress({
  value,
  max,
  label,
  labelIcon: LabelIcon,
  display,
  tone = 'brand',
  thresholds,
  status,
}: ProgressProps) {
  const t = resolveTone(value, tone, thresholds);
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const StatusIcon = status?.icon;

  return (
    <div
      className={cn('progress', t !== 'brand' && `progress-${t}`)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="progress-head">
        <span className="progress-label">
          {LabelIcon ? <LabelIcon aria-hidden="true" /> : null}
          {label}
        </span>
        {display ? <span className="progress-value">{display}</span> : null}
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      {status ? (
        <span className="progress-status">
          {StatusIcon ? <StatusIcon aria-hidden="true" /> : null}
          {status.label}
        </span>
      ) : null}
    </div>
  );
}
