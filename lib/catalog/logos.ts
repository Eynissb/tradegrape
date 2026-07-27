/**
 * Résolution des logos déposés dans `public/brand/` (noms de fichiers EXACTS,
 * espaces et casse compris — inventoriés sur le disque, jamais devinés).
 *
 * Deux tables : firms et plateformes, par slug. Le composant garde toujours un
 * fallback (monogramme / texte) : un slug sans logo NE CASSE PAS la ligne.
 *
 * ⚠️ Slugs des firms encore en BROUILLON (non lisibles par la clé anon à cause
 * de la RLS) : ils sont présumés par convention nom→slug et marqués comme tels.
 * À confirmer à la publication ; un slug erroné retombe simplement sur le
 * monogramme.
 */

const BRAND = '/brand';

const FIRM_LOGO: Record<string, string> = {
  // ---- Firms publiées : slugs VÉRIFIÉS en base ----
  'bulenox': 'Bulenox Logo.png',
  'lucid-trading': 'Lucid Trading Logo.png',
  'take-profit-trader': 'TakeProfitTrader Logo.png',
  'tradeify': 'Tradeify Logo.png',

  // ---- Firms en brouillon : slugs PRÉSUMÉS (à confirmer à la publication) ----
  'alpha-futures': 'Alpha Futures Logo.png',
  'apex-trader-funding': 'Apex Trading Logo.png',
  'funded-futures-network': 'Funded Future Network Logo.png',
  'fundednext': 'FundedNext Logo.png',
  'my-funded-futures': 'MyFundedFutures Logo.png',
  'phidias': 'Phidias Propfirm Logo.png',
  'topstep': 'TopStep Logo.png',
  'tradeday': 'Tradeday Logo.png',
  'yrm-prop': 'YRM Prop Logo.png',
};

const PLATFORM_LOGO: Record<string, string> = {
  ninjatrader: 'NinjaTrader Logo.png',
  rithmic: 'Rithmic Logo.png',
  tradovate: 'Tradovate Logo.png',
};

/** `/brand/Nom De Fichier.png` → URL avec espaces encodés. */
const url = (file: string): string => `${BRAND}/${encodeURIComponent(file)}`;

export function firmLogoUrl(slug: string): string | null {
  const f = FIRM_LOGO[slug];
  return f ? url(f) : null;
}

export function platformLogoUrl(slug: string): string | null {
  const f = PLATFORM_LOGO[slug];
  return f ? url(f) : null;
}

/**
 * Couleur de marque déterministe pour le MONOGRAMME de secours (quand aucun logo
 * n'est trouvé) : une teinte stable par firm, jamais le violet uniforme. Bleu et
 * cyan (≈185–255°) sont écartés — direction rejetée (CLAUDE.md).
 */
export function firmColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let hue = h % 360;
  if (hue > 185 && hue < 255) hue = (hue + 90) % 360;
  return `linear-gradient(135deg, hsl(${hue} 60% 52%), hsl(${(hue + 26) % 360} 62% 40%))`;
}
