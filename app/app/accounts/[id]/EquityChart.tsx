import type { EquityPoint } from '@/lib/journal/analytics';

/**
 * Courbe d'équité avec le plancher de drawdown superposé — notre angle : on
 * visualise la MARGE (solde − plancher), pas seulement le solde. SVG pur, sans
 * dépendance, sur surface solide et lisible.
 */
export default function EquityChart({
  points,
  startingBalance,
  currency,
}: {
  points: EquityPoint[];
  startingBalance: number;
  currency: string;
}) {
  if (points.length < 2) {
    return (
      <div className="acct2-empty">
        Pas assez de données sur la période pour tracer la courbe (2 jours minimum).
      </div>
    );
  }

  const W = 760;
  const H = 280;
  const padL = 72;
  const padR = 18;
  const padT = 18;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const equities = points.map((p) => p.equity);
  const floors = points.map((p) => p.floor);
  let yMin = Math.min(...floors, ...equities, startingBalance);
  let yMax = Math.max(...equities, startingBalance);
  if (yMax === yMin) yMax = yMin + 1;
  const range = yMax - yMin;
  yMin -= range * 0.06;
  yMax += range * 0.06;

  const x = (i: number) => padL + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const fmt = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
  const fmtFull = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const equityPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.equity).toFixed(1)}`).join(' ');
  const floorPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.floor).toFixed(1)}`).join(' ');

  // Bande de marge : solde par-dessus, plancher au retour.
  const marginArea =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.equity).toFixed(1)}`).join(' ') +
    ' ' +
    [...points].reverse().map((p, i) => `L ${x(points.length - 1 - i).toFixed(1)} ${y(p.floor).toFixed(1)}`).join(' ') +
    ' Z';

  // Ticks Y (4) + ligne du capital initial.
  const ticks = [0, 1, 2, 3].map((k) => yMin + (range * 1.12 * k) / 3);

  return (
    <div className="eq-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Courbe d'équité et plancher de drawdown" preserveAspectRatio="xMidYMid meet">
        {/* grille + labels Y */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="eq-grid" />
            <text x={padL - 10} y={y(v) + 4} textAnchor="end" className="eq-axis">{fmt.format(v)}</text>
          </g>
        ))}

        {/* capital initial */}
        <line x1={padL} x2={W - padR} y1={y(startingBalance)} y2={y(startingBalance)} className="eq-start" />
        <text x={W - padR} y={y(startingBalance) - 5} textAnchor="end" className="eq-axis eq-axis-start">
          capital {fmtFull.format(startingBalance)}
        </text>

        {/* marge (cushion) */}
        <path d={marginArea} className="eq-margin" />

        {/* plancher + équité */}
        <path d={floorPath} className="eq-floor" fill="none" />
        <path d={equityPath} className="eq-equity" fill="none" />

        {/* labels X : première et dernière date */}
        <text x={padL} y={H - 10} textAnchor="start" className="eq-axis">{points[0].date}</text>
        <text x={W - padR} y={H - 10} textAnchor="end" className="eq-axis">{points[points.length - 1].date}</text>
      </svg>

      <div className="eq-legend">
        <span><span className="eq-key eq-key-equity" /> Équité</span>
        <span><span className="eq-key eq-key-floor" /> Plancher de drawdown</span>
        <span><span className="eq-key eq-key-margin" /> Marge (solde − plancher)</span>
      </div>
    </div>
  );
}
