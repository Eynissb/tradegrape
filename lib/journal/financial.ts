/**
 * Bilan financier prop firm — fonctions PURES (ni réseau ni DB).
 *
 * La question que tout trader prop firm se pose sans jamais avoir la réponse :
 * « est-ce que je gagne réellement de l'argent avec ça ? » On croise ce qui a été
 * DÉPENSÉ (account_purchases : challenges, resets, activations) avec ce qui a été
 * REÇU (journal_payouts). Aucun concurrent ne le calcule.
 */

export type PurchaseKind = 'challenge' | 'reset' | 'activation';

export interface FinAccount {
  id: string;
  status: string; // evaluation | funded | passed | failed | archived
  firmName: string;
}
export interface FinPurchase {
  accountId: string;
  kind: string;
  amount: number;
  purchasedAt: string; // YYYY-MM-DD
}
export interface FinPayout {
  accountId: string;
  amount: number;
  receivedAt: string | null; // YYYY-MM-DD | null (non encore reçu)
}

export interface FirmBreakdown {
  firm: string;
  accounts: number;
  spent: number;
  payouts: number;
  net: number;
}

export interface FinancialBalance {
  totalSpent: number;
  spentByKind: Record<PurchaseKind, number>;
  accountsTotal: number;
  active: number; // evaluation + funded
  passed: number;
  failed: number;
  archived: number;
  /** Comptes ayant atteint le stade financé (funded + passed). */
  fundedReached: number;
  payoutsReceived: number;
  netResult: number;
  /** Réussite = comptes financés / (financés + échoués), en %. */
  successRate: number | null;
  /** Coût moyen pour obtenir un compte financé. */
  avgCostPerFunded: number | null;
  /** Délai moyen (jours) entre le 1er achat d'un compte et son 1er payout reçu. */
  avgDaysToFirstPayout: number | null;
  byFirm: FirmBreakdown[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function buildFinancialBalance(params: {
  accounts: FinAccount[];
  purchases: FinPurchase[];
  payouts: FinPayout[];
}): FinancialBalance {
  const { accounts, purchases, payouts } = params;

  const spentByKind: Record<PurchaseKind, number> = { challenge: 0, reset: 0, activation: 0 };
  for (const p of purchases) {
    if (p.kind === 'challenge' || p.kind === 'reset' || p.kind === 'activation') {
      spentByKind[p.kind] = round2(spentByKind[p.kind] + p.amount);
    }
  }
  const totalSpent = round2(spentByKind.challenge + spentByKind.reset + spentByKind.activation);

  const active = accounts.filter((a) => a.status === 'evaluation' || a.status === 'funded').length;
  const passed = accounts.filter((a) => a.status === 'passed').length;
  const failed = accounts.filter((a) => a.status === 'failed').length;
  const archived = accounts.filter((a) => a.status === 'archived').length;
  const fundedReached = accounts.filter((a) => a.status === 'funded' || a.status === 'passed').length;

  const payoutsReceived = round2(
    payouts.filter((p) => p.receivedAt).reduce((s, p) => s + p.amount, 0),
  );
  const netResult = round2(payoutsReceived - totalSpent);

  const decided = fundedReached + failed;
  const successRate = decided ? round2((fundedReached / decided) * 100) : null;
  const avgCostPerFunded = fundedReached ? round2(totalSpent / fundedReached) : null;

  // Délai jusqu'au premier payout : par compte, min(receivedAt) − min(purchasedAt).
  const firstBuy = new Map<string, string>();
  for (const p of purchases) {
    const cur = firstBuy.get(p.accountId);
    if (!cur || p.purchasedAt < cur) firstBuy.set(p.accountId, p.purchasedAt);
  }
  const firstPay = new Map<string, string>();
  for (const p of payouts) {
    if (!p.receivedAt) continue;
    const cur = firstPay.get(p.accountId);
    if (!cur || p.receivedAt < cur) firstPay.set(p.accountId, p.receivedAt);
  }
  const delays: number[] = [];
  for (const [accountId, payDate] of firstPay) {
    const buyDate = firstBuy.get(accountId);
    if (buyDate) delays.push(daysBetween(buyDate, payDate));
  }
  const avgDaysToFirstPayout = delays.length
    ? Math.round(delays.reduce((s, d) => s + d, 0) / delays.length)
    : null;

  // Répartition par firm.
  const firmOf = new Map<string, string>();
  for (const a of accounts) firmOf.set(a.id, a.firmName);
  const firms = new Map<string, FirmBreakdown>();
  const ensure = (firm: string): FirmBreakdown => {
    let b = firms.get(firm);
    if (!b) {
      b = { firm, accounts: 0, spent: 0, payouts: 0, net: 0 };
      firms.set(firm, b);
    }
    return b;
  };
  for (const a of accounts) ensure(a.firmName).accounts += 1;
  for (const p of purchases) {
    const firm = firmOf.get(p.accountId);
    if (firm) ensure(firm).spent = round2(ensure(firm).spent + p.amount);
  }
  for (const p of payouts) {
    if (!p.receivedAt) continue;
    const firm = firmOf.get(p.accountId);
    if (firm) ensure(firm).payouts = round2(ensure(firm).payouts + p.amount);
  }
  const byFirm = [...firms.values()]
    .map((b) => ({ ...b, net: round2(b.payouts - b.spent) }))
    .sort((a, b) => b.net - a.net || a.firm.localeCompare(b.firm));

  return {
    totalSpent,
    spentByKind,
    accountsTotal: accounts.length,
    active,
    passed,
    failed,
    archived,
    fundedReached,
    payoutsReceived,
    netResult,
    successRate,
    avgCostPerFunded,
    avgDaysToFirstPayout,
    byFirm,
  };
}
