/**
 * Classification symbole → classe d'actif (futures) — fonction PURE.
 *
 * Sert la mutualisation des commissions : le tarif dépend du triplet
 * firm × plateforme × classe d'actif (un micro ≠ un mini). Les symboles importés
 * portent une échéance (MNQU6 = MNQ, septembre 2026) qu'on retire pour retrouver
 * la racine.
 *
 * La table de base est volontairement courte et stable ; `overrides` permet de
 * la compléter depuis l'admin pour les symboles non reconnus.
 */

export type AssetClass =
  | 'indices'
  | 'micro_indices'
  | 'energy'
  | 'micro_energy'
  | 'metals'
  | 'micro_metals'
  | 'currencies'
  | 'bonds'
  | 'agri';

/** Racines connues → classe d'actif. Éditable/complétable en admin via overrides. */
export const SYMBOL_ROOTS: Readonly<Record<string, AssetClass>> = {
  ES: 'indices', NQ: 'indices', RTY: 'indices', YM: 'indices',
  MES: 'micro_indices', MNQ: 'micro_indices', M2K: 'micro_indices', MYM: 'micro_indices',
  CL: 'energy', MCL: 'micro_energy',
  GC: 'metals', MGC: 'micro_metals',
  '6E': 'currencies', '6B': 'currencies',
  ZB: 'bonds', ZN: 'bonds',
  ZC: 'agri', ZS: 'agri',
};

// Lettres de mois futures (F,G,H,J,K,M,N,Q,U,V,X,Z) suivies d'une année 1-2 chiffres.
const EXPIRY = /[FGHJKMNQUVXZ]\d{1,2}$/;

/** Retire le code d'échéance en fin de symbole → racine (MNQU6 → MNQ, ES → ES). */
export function rootSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(EXPIRY, '');
}

/**
 * Classe d'actif d'un symbole, ou null si inconnu (à cartographier en admin).
 * `overrides` (racine → classe) est fusionné par-dessus la table de base.
 */
export function classifySymbol(
  symbol: string,
  overrides?: Record<string, AssetClass>,
): AssetClass | null {
  const s = symbol.trim().toUpperCase();
  const map = overrides ? { ...SYMBOL_ROOTS, ...overrides } : SYMBOL_ROOTS;
  // symbole brut d'abord (au cas où une racine contiendrait un motif d'échéance),
  // puis la racine sans échéance.
  return map[s] ?? map[rootSymbol(s)] ?? null;
}
