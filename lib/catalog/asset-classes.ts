/**
 * Classes d'actifs pour les commissions par firm (`firm_commissions.asset_class`).
 * Source unique partagée par l'admin et le futur commission_calculator.
 * `asset_class` est libre en base ; on fige ici la liste qui structure la saisie.
 */
export const ASSET_CLASSES: readonly { key: string; label: string; ex: string }[] = [
  { key: 'indices', label: 'Indices (minis)', ex: 'ES, NQ, YM, RTY' },
  { key: 'micro_indices', label: 'Indices (micros)', ex: 'MES, MNQ, MYM, M2K' },
  { key: 'energy', label: 'Énergie', ex: 'CL, NG, RB' },
  { key: 'micro_energy', label: 'Énergie (micros)', ex: 'MCL' },
  { key: 'metals', label: 'Métaux', ex: 'GC, SI, HG' },
  { key: 'micro_metals', label: 'Métaux (micros)', ex: 'MGC, SIL' },
  { key: 'bonds', label: 'Obligations', ex: 'ZB, ZN, ZF, ZT' },
  { key: 'currencies', label: 'Devises', ex: '6E, 6J, 6B' },
  { key: 'agriculture', label: 'Agricole', ex: 'ZC, ZS, ZW' },
  { key: 'crypto', label: 'Crypto', ex: 'MBT, MET' },
];
