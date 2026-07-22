import type { CumulativePoint } from '@/lib/journal/analytics';

/**
 * P&L net cumulé, tous comptes confondus. Pas de plancher de drawdown : les règles
 * sont par compte, seules les analytics s'agrègent. Ligne unique + ligne du zéro.
 */
export default function CumulativeChart({ points, currency }: { points: CumulativePoint[]; currency: string }) {
  if (points.length < 2) {
    return <div className="acct2-empty">Pas assez de données sur la période pour tracer la courbe (2 jours minimum).</div>;
  }

  const W = 760;
  const H = 260;
  const padL = 72;
  const padR = 18;
  const padT = 18;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const vals = points.map((p) => p.pnl);
  let yMin = Math.min(0, ...vals);
  let yMax = Math.max(0, ...vals);
  if (yMax === yMin) yMax = yMin + 1;
  const range = yMax - yMin;
  yMin -= range * 0.06;
  yMax += range * 0.06;

  const x = (i: number) => padL + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const fmt = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.pnl).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  const last = points[points.length - 1].pnl;
  const ticks = [0, 1, 2, 3].map((k) => yMin + (range * 1.12 * k) / 3);

  // Même traitement que la courbe d'équité : teinte d'état, aire en dégradé
  // vertical, jamais l'accent de marque sur une donnée.
  const tone = last >= 0 ? 'is-win' : 'is-loss';
  const fillId = last >= 0 ? 'eqFillWin' : 'eqFillLoss';

  return (
    <div className="eq-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="P&L net cumulé tous comptes" preserveAspectRatio="xMidYMid meet">
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
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="eq-grid" />
            <text x={padL - 10} y={y(v) + 4} textAnchor="end" className="eq-axis">{fmt.format(v)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} className="eq-start" />
        <path d={area} className="eq-area" fill={`url(#${fillId})`} />
        <path d={line} className={`eq-equity ${tone}`} fill="none" />
        <text x={padL} y={H - 10} textAnchor="start" className="eq-axis">{points[0].date}</text>
        <text x={W - padR} y={H - 10} textAnchor="end" className="eq-axis">{points[points.length - 1].date}</text>
      </svg>
      <div className="eq-legend">
        <span><span className={`eq-key eq-key-equity ${tone}`} /> P&L net cumulé</span>
        <span><span className="eq-key eq-key-start" /> Zéro</span>
        <span className="num">Total : {last >= 0 ? '+' : '−'}{Math.abs(last).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
      </div>
    </div>
  );
}
