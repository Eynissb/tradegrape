/**
 * Vague de lignes parallèles (courbes de niveau, réf. Stripe / section « Comment ça
 * marche ») pour le panneau promo de l'auth. Pré-calculée (SSR, déterministe),
 * animée en CSS. Dégradé indigo→fuchsia→magenta, jamais de bleu/cyan.
 */
const WAVE = (() => {
  const N = 40; // lignes
  const S = 20; // points par ligne
  const X0 = -180;
  const X1 = 1180;
  const smooth = (pts: [number, number][]) => {
    let d = `M ${pts[0][0]} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const centerY = (u: number) =>
    500 + (u - 0.5) * 130 + Math.sin(u * Math.PI * 1.3 + 0.6) * 74 + Math.sin(u * Math.PI * 2.6 + 1.1) * 22;
  const spread = (u: number) => 640 + Math.sin(u * Math.PI * 1.7 - 0.4) * 150;
  return Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const pts = Array.from({ length: S }, (_, s): [number, number] => {
      const x = X0 + (X1 - X0) * (s / (S - 1));
      const u = x / 1000;
      return [Math.round(x), centerY(u) + (t - 0.5) * spread(u)];
    });
    return { d: smooth(pts), o: +(0.18 + (1 - Math.min(1, Math.abs(t - 0.5) * 2)) * 0.5).toFixed(2) };
  });
})();

export default function AuthWave() {
  return (
    <div className="auth-promo-wave" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="authWave" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8f6cff" />
            <stop offset="48%" stopColor="#c04bff" />
            <stop offset="100%" stopColor="#ff5cc0" />
          </linearGradient>
        </defs>
        <g className="auth-promo-wave-g" stroke="url(#authWave)" fill="none" strokeWidth="1.1">
          {WAVE.map((p, i) => (
            <path key={i} d={p.d} style={{ opacity: p.o }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
