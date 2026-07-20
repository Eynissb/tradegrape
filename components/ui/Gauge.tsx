import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { resolveTone, type Tone } from './Progress';

const R = 52;
const CIRC = 2 * Math.PI * R; // ≈ 326.726

export interface GaugeProps {
  value: number;
  max: number;
  /** Texte central (ex "69 %"). */
  valueText: ReactNode;
  unit?: ReactNode;
  label?: ReactNode;
  labelIcon?: LucideIcon;
  tone?: Tone | 'auto';
  thresholds?: { warn: number; danger: number };
  size?: number;
  'aria-label'?: string;
}

/** Jauge circulaire DS (SVG stroke-dasharray). Surface de contenu, lisible. */
export default function Gauge({
  value,
  max,
  valueText,
  unit,
  label,
  labelIcon: LabelIcon,
  tone = 'brand',
  thresholds,
  size = 120,
  'aria-label': ariaLabel,
}: GaugeProps) {
  const t = resolveTone(value, tone, thresholds);
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const offset = CIRC * (1 - pct);
  const StatusIcon = LabelIcon;

  return (
    <div
      className={cn('gauge', `gauge-${t}`)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
    >
      <div className="gauge-figure" style={{ width: size, height: size }}>
        <svg className="gauge-svg" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b3fff" />
              <stop offset="100%" stopColor="#c04bff" />
            </linearGradient>
          </defs>
          <circle className="track" cx="60" cy="60" r={R} />
          <circle
            className="bar"
            cx="60"
            cy="60"
            r={R}
            strokeDasharray={CIRC.toFixed(1)}
            strokeDashoffset={offset.toFixed(1)}
          />
        </svg>
        <div className="gauge-center">
          <span className="val">{valueText}</span>
          {unit ? <span className="unit">{unit}</span> : null}
        </div>
      </div>
      {label ? (
        <span className="gauge-label">
          {StatusIcon ? <StatusIcon aria-hidden="true" /> : null}
          {label}
        </span>
      ) : null}
    </div>
  );
}
