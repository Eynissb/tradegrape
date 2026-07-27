/**
 * Résolution des logos déposés dans `public/brand/` (noms de fichiers EXACTS,
 * espaces et casse compris — inventoriés sur le disque, jamais devinés).
 *
 * Chaque logo porte deux mesures relevées sur le PNG (alpha + luminance) :
 *  - `light` : le tracé est clair (blanc/coloré) → il lui faut un fond SOMBRE ;
 *    sinon il est sombre (ex. Lucid, les 3 plateformes) → fond CLAIR.
 *  - `fill`  : part de la pastille réellement occupée par le tracé (le reste est
 *    du vide transparent). Sert à calculer un agrandissement pour que le logo
 *    REMPLISSE sa pastille au lieu de flotter minuscule au centre.
 *
 * Le composant garde toujours un fallback (monogramme / glyphe) : un slug sans
 * logo NE CASSE PAS la ligne.
 *
 * ⚠️ Slugs des firms en BROUILLON (non lisibles par la clé anon) : présumés par
 * convention nom→slug, à confirmer à la publication. Un slug erroné retombe sur
 * le monogramme.
 */

interface LogoMeta {
  file: string;
  /** Tracé clair (→ fond sombre) vs sombre (→ fond clair). */
  light: boolean;
  /** Fraction de la pastille occupée par le tracé (0–1). */
  fill: number;
}

const FIRM_LOGO: Record<string, LogoMeta> = {
  // ---- Firms publiées : slugs VÉRIFIÉS ----
  'bulenox': { file: 'Bulenox Logo.png', light: true, fill: 0.5 },
  'lucid-trading': { file: 'Lucid Trading Logo.png', light: false, fill: 0.38 },
  'take-profit-trader': { file: 'TakeProfitTrader Logo.png', light: true, fill: 0.58 },
  'tradeify': { file: 'Tradeify Logo.png', light: true, fill: 0.42 },
  // ---- Firms en brouillon : slugs PRÉSUMÉS (à confirmer à la publication) ----
  'alpha-futures': { file: 'Alpha Futures Logo.png', light: true, fill: 0.54 },
  'apex-trader-funding': { file: 'Apex Trading Logo.png', light: true, fill: 0.69 },
  'funded-futures-network': { file: 'Funded Future Network Logo.png', light: true, fill: 0.75 },
  'fundednext': { file: 'FundedNext Logo.png', light: true, fill: 0.54 },
  'my-funded-futures': { file: 'MyFundedFutures Logo.png', light: true, fill: 0.56 },
  'phidias': { file: 'Phidias Propfirm Logo.png', light: true, fill: 0.67 },
  'topstep': { file: 'TopStep Logo.png', light: true, fill: 0.63 },
  'tradeday': { file: 'Tradeday Logo.png', light: true, fill: 0.58 },
  'yrm-prop': { file: 'YRM Prop Logo.png', light: true, fill: 0.63 },
};

const PLATFORM_LOGO: Record<string, LogoMeta> = {
  ninjatrader: { file: 'NinjaTrader Logo.png', light: false, fill: 0.63 },
  rithmic: { file: 'Rithmic Logo.png', light: false, fill: 0.71 },
  tradovate: { file: 'Tradovate Logo.png', light: false, fill: 0.54 },
};

export interface ResolvedLogo {
  url: string;
  /** `true` → poser sur fond sombre ; `false` → pastille claire. */
  light: boolean;
  /** Facteur d'agrandissement pour remplir la pastille (le vide transparent déborde et est rogné). */
  scale: number;
}

function resolve(m: LogoMeta | undefined): ResolvedLogo | null {
  if (!m) return null;
  // Cible : que le plus grand côté du tracé atteigne ~92 % de la pastille.
  const scale = Math.min(2.1, Math.max(1, +(0.92 / m.fill).toFixed(2)));
  return { url: `/brand/${encodeURIComponent(m.file)}`, light: m.light, scale };
}

export const firmLogo = (slug: string): ResolvedLogo | null => resolve(FIRM_LOGO[slug]);
export const platformLogo = (slug: string): ResolvedLogo | null => resolve(PLATFORM_LOGO[slug]);

/**
 * Couleur de marque déterministe pour le MONOGRAMME de secours (aucun logo
 * trouvé) : teinte stable par firm, jamais le violet uniforme. Bleu et cyan
 * (≈185–255°) écartés — direction rejetée (CLAUDE.md).
 */
export function firmColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let hue = h % 360;
  if (hue > 185 && hue < 255) hue = (hue + 90) % 360;
  return `linear-gradient(135deg, hsl(${hue} 60% 52%), hsl(${(hue + 26) % 360} 62% 40%))`;
}
