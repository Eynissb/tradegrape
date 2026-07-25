/**
 * Illustration du hero — maquette d'interface STYLISÉE, pas une capture.
 *
 * SVG inline (jamais de bitmap) : les couleurs viennent de nos tokens via
 * `var(--…)`, donc l'illustration suit le thème et notre palette. Elle évoque
 * les deux faces du produit : des lignes de tableau abstraites (comparateur) et
 * une jauge circulaire de règle (journal). Décorative — `aria-hidden` côté page.
 *
 * Le dégradé de marque est autorisé ici : c'est du DÉCOR, pas de la donnée.
 */
export default function HeroArt() {
  const rows = [0, 1, 2, 3];
  return (
    <svg
      className="home-art-svg"
      viewBox="0 0 460 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Aperçu stylisé du comparateur et du journal"
    >
      <defs>
        <linearGradient id="ha-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--c1)" />
          <stop offset="1" stopColor="var(--c2)" />
        </linearGradient>
        <linearGradient id="ha-ring" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--lime)" />
          <stop offset="1" stopColor="var(--c2)" />
        </linearGradient>
      </defs>

      {/* Panneau principal — surface en élévation, lignes de tableau abstraites */}
      <g>
        <rect x="34" y="70" width="330" height="300" rx="18"
          fill="var(--card)" stroke="var(--card-brd)" />
        {/* barre de titre */}
        <circle cx="58" cy="96" r="5" fill="var(--hot)" opacity="0.8" />
        <circle cx="74" cy="96" r="5" fill="var(--amber)" opacity="0.7" />
        <circle cx="90" cy="96" r="5" fill="var(--lime)" opacity="0.7" />
        <rect x="250" y="90" width="90" height="12" rx="6" fill="var(--elev-2-bg)" />

        {rows.map((i) => {
          const y = 130 + i * 56;
          const active = i === 1;
          return (
            <g key={i}>
              <rect x="50" y={y} width="298" height="44" rx="10"
                fill="var(--elev-2-bg)"
                stroke={active ? 'url(#ha-grad)' : 'transparent'}
                strokeWidth={active ? 1.5 : 0} />
              {/* pastille logo carrée */}
              <rect x="60" y={y + 10} width="24" height="24" rx="6" fill="url(#ha-grad)" opacity="0.9" />
              {/* deux lignes de texte */}
              <rect x="96" y={y + 12} width="96" height="8" rx="4" fill="var(--ink)" opacity="0.55" />
              <rect x="96" y={y + 26} width="64" height="7" rx="3.5" fill="var(--ink3)" opacity="0.6" />
              {/* prix */}
              <rect x="220" y={y + 17} width="42" height="10" rx="5" fill="var(--ink)" opacity="0.7" />
              {/* mini-jauge de note */}
              <circle cx="322" cy={y + 22} r="12" stroke="var(--card-brd)" strokeWidth="3" />
              <circle cx="322" cy={y + 22} r="12" stroke="var(--lime)" strokeWidth="3"
                strokeDasharray="75 100" strokeLinecap="round"
                transform={`rotate(-90 322 ${y + 22})`} opacity={active ? 1 : 0.75} />
            </g>
          );
        })}
      </g>

      {/* Jauge circulaire flottante — la règle du journal */}
      <g transform="translate(360 40)">
        <circle cx="46" cy="46" r="46" fill="var(--bg2)" stroke="var(--card-brd)" />
        <circle cx="46" cy="46" r="34" stroke="var(--elev-2-bg)" strokeWidth="8" />
        <circle cx="46" cy="46" r="34" stroke="url(#ha-ring)" strokeWidth="8"
          strokeDasharray="150 214" strokeLinecap="round" transform="rotate(-90 46 46)" />
        <text x="46" y="52" textAnchor="middle"
          fontFamily="var(--font-title)" fontSize="26" fontWeight="800"
          fill="var(--ink)">8</text>
      </g>

      {/* Chip payout flottant — notre signature, en dégradé */}
      <g transform="translate(18 300)">
        <rect x="0" y="0" width="150" height="60" rx="14" fill="url(#ha-grad)" />
        <rect x="16" y="16" width="60" height="8" rx="4" fill="#fff" opacity="0.7" />
        <rect x="16" y="32" width="104" height="12" rx="6" fill="#fff" opacity="0.95" />
      </g>
    </svg>
  );
}
