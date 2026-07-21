/**
 * Commissions du journal — fonctions PURES (ni réseau ni DB).
 *
 * Les exports Tradovate/Apex ne portent aucune colonne de frais et le `pnl` est
 * BRUT. On demande à l'utilisateur le total de commissions affiché par sa
 * plateforme pour la période importée, puis :
 *   1. on en déduit une commission par contrat aller-retour (total ÷ contrats) ;
 *   2. on la stocke au niveau du compte pour les imports suivants ;
 *   3. on répartit le total sur les trades du lot importé (aux centimes) pour
 *      que le net retombe exactement sur le chiffre de la plateforme.
 *
 * Aucun tarif « trouvé en ligne » : la valeur vient toujours d'un relevé réel.
 */

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CommissionTrade {
  pnl: number;
  quantity: number | null;
}

/** Quantité effective d'un trade (aller-retour) : ≥1, défaut 1 si absente. */
export function contractsOfTrade(quantity: number | null): number {
  return quantity && quantity > 0 ? quantity : 1;
}

/** Total de contrats aller-retour d'un lot. */
export function totalContracts(trades: CommissionTrade[]): number {
  return trades.reduce((s, t) => s + contractsOfTrade(t.quantity), 0);
}

/** Commission par contrat aller-retour déduite d'un total saisi. */
export function derivePerContract(totalCommissions: number, contracts: number): number {
  if (contracts <= 0) return 0;
  return Math.round((totalCommissions / contracts) * 10000) / 10000;
}

/** Frais d'un trade = quantité × commission/contrat (imports suivants). */
export function feesForTrade(quantity: number | null, perContract: number): number {
  return round2(contractsOfTrade(quantity) * perContract);
}

export interface CommissionSummary {
  contracts: number;
  grossPnl: number;
  commissions: number;
  netPnl: number;
}

/** Récap brut / commissions / net à afficher AVANT application (vérification). */
export function summarize(trades: CommissionTrade[], commissions: number): CommissionSummary {
  const grossPnl = round2(trades.reduce((s, t) => s + t.pnl, 0));
  return {
    contracts: totalContracts(trades),
    grossPnl,
    commissions: round2(commissions),
    netPnl: round2(grossPnl - commissions),
  };
}

/**
 * Répartit un total de commissions sur les trades, pondéré par les contrats,
 * en garantissant que la somme des frais == total (au centime près). Le reliquat
 * de centimes va aux plus grandes parts fractionnaires (méthode du plus fort reste).
 */
export function distributeCommissions(totalCommissions: number, trades: CommissionTrade[]): number[] {
  const contracts = trades.map((t) => contractsOfTrade(t.quantity));
  const sumContracts = contracts.reduce((a, b) => a + b, 0);
  if (sumContracts <= 0 || trades.length === 0) return trades.map(() => 0);

  const totalCents = Math.round(totalCommissions * 100);
  const rawCents = contracts.map((c) => (totalCents * c) / sumContracts);
  const cents = rawCents.map((x) => Math.floor(x));
  let remainder = totalCents - cents.reduce((a, b) => a + b, 0);

  const byFrac = rawCents
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < byFrac.length; k++) cents[byFrac[k].i] += 1;
  // Sécurité si remainder > nb de trades (ne devrait pas arriver).
  remainder -= byFrac.length;
  let j = 0;
  while (remainder > 0) {
    cents[byFrac[j % byFrac.length].i] += 1;
    remainder--;
    j++;
  }

  return cents.map((c) => c / 100);
}
