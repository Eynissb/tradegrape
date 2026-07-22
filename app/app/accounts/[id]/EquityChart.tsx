import type { EquityPoint } from '@/lib/journal/analytics';
import { compactNumber } from '@/app/app/_components/journal-ui';

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

  const fmtFull = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const equityPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.equity).toFixed(1)}`).join(' ');
  const floorPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.floor).toFixed(1)}`).join(' ');

  // La donnée ne porte JAMAIS l'accent de marque : la courbe prend la couleur
  // de l'état (au-dessus du capital initial = gain, en dessous = perte).
  const above = points[points.length - 1].equity >= startingBalance;
  const tone = above ? 'is-win' : 'is-loss';
  const fillId = above ? 'eqFillWin' : 'eqFillLoss';

  // Aire sous la courbe : de la courbe jusqu'au bas du cadre.
  const baseY = (padT + innerH).toFixed(1);
  const equityArea = `${equityPath} L ${x(points.length - 1).toFixed(1)} ${baseY} L ${x(0).toFixed(1)} ${baseY} Z`;

  // Ticks Y (4) + ligne du capital initial.
  const ticks = [0, 1, 2, 3].map((k) => yMin + (range * 1.12 * k) / 3);

  return (
    <div className="eq-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Courbe d'équité et plancher de drawdown" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="eqFillWin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,255,176,.18)" />
            <stop offset="100%" stopColor="rgba(56,255,176,0)" />
          </linearGradient>
          <linearGradient id="eqFillLoss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,77,94,.18)" />
            <stop offset="100%" stopColor="rgba(255,77,94,0)" />
          </linearGradient>
        </defs>

        {/* grille + labels Y */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="eq-grid" />
            <text x={padL - 10} y={y(v) + 4} textAnchor="end" className="eq-axis">{compactNumber(v)}</text>
          </g>
        ))}

        {/* capital initial */}
        <line x1={padL} x2={W - padR} y1={y(startingBalance)} y2={y(startingBalance)} className="eq-start" />
        <text x={W - padR} y={y(startingBalance) - 5} textAnchor="end" className="eq-axis eq-axis-start">
          capital {fmtFull.format(startingBalance)}
        </text>

        {/* aire sous la courbe, à la teinte de la ligne */}
        <path d={equityArea} className="eq-area" fill={`url(#${fillId})`} />

        {/* plancher + équité */}
        <path d={floorPath} className="eq-floor" fill="none" />
        <path d={equityPath} className={`eq-equity ${tone}`} fill="none" />

        {/* labels X : première et dernière date */}
        <text x={padL} y={H - 10} textAnchor="start" className="eq-axis">{points[0].date}</text>
        <text x={W - padR} y={H - 10} textAnchor="end" className="eq-axis">{points[points.length - 1].date}</text>
      </svg>

      <div className="eq-legend">
        <span><span className={`eq-key eq-key-equity ${tone}`} /> Équité</span>
        <span><span className="eq-key eq-key-floor" /> Plancher de drawdown</span>
        <span><span className="eq-key eq-key-start" /> Capital initial</span>
      </div>
    </div>
  );
}
