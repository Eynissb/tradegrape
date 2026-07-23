/**
 * Tradegrape — types du moteur de règles.
 *
 * Le moteur est PUR : aucun accès réseau ni DB. Il prend un jeu de règles
 * et une liste de trades, il rend un statut. Testable, utilisable côté
 * client comme serveur.
 */

export type DrawdownType = 'EOD' | 'TRAIL' | 'STATIC';
export type MarketType = 'futures' | 'forex' | 'crypto';

/** Règles d'une offre (snapshot pris à l'ajout du compte au journal). */
export interface OfferRules {
  marketType: MarketType;
  accountSize: number;

  drawdownType: DrawdownType;
  drawdownAmount: number;

  /** null = compte direct, pas d'objectif. */
  profitTarget: number | null;
  /** null = pas de daily loss limit. */
  dailyLossLimit: number | null;
  /** Aucun jour ne doit dépasser ce % du profit total. 100 = aucune contrainte. */
  consistencyPct: number | null;
  minTradingDays: number;

  /* ---- Variantes appliquées UNE FOIS LE COMPTE FINANCÉ ----
     Plusieurs firms durcissent les règles au passage en funded : Take Profit
     Trader passe d'EOD à trailing intraday, TradeDay QuickPay force le trailing
     même si l'évaluation a été passée en EOD. C'est le mécanisme qui fait perdre
     le plus de comptes financés — il doit être appliqué, pas seulement stocké.
     `null`/absent = identique à l'évaluation. Résolution : `rulesForPhase`. */

  /** Type de drawdown en compte financé, s'il diffère de l'évaluation. */
  fundedDrawdownType?: DrawdownType | null;
  /** Perte journalière max en compte financé, si elle diffère de l'évaluation. */
  fundedDailyLossLimit?: number | null;

  /**
   * Le plancher se fige-t-il au capital initial une fois atteint ?
   * Comportement le plus courant, mais pas universel : Apex ne verrouille
   * JAMAIS sur Tradovate — le plancher continue alors de suivre le plus haut,
   * bien au-dessus du capital. `undefined` = true (défaut historique).
   */
  drawdownLocksAtBreakeven?: boolean;
}

/** Règles de retrait en compte financé. */
export interface PayoutRules {
  /** Solde minimum à maintenir : on ne retire que ce qui dépasse. */
  buffer: number | null;
  /** Montant minimum de retrait. */
  minAmount: number | null;
  /** Jours de profit requis dans le cycle. */
  minProfitDays: number | null;
  /** Seuil qu'un jour doit atteindre pour compter comme jour de profit. */
  dailyThreshold: number | null;
  /** Cohérence appliquée en funded (souvent différente de l'évaluation). */
  consistencyPct: number | null;
  /** Objectif de profit minimum du cycle. */
  minCycleProfit: number | null;
  /** Plafond de retrait en montant. */
  maxAmount: number | null;
  /** Plafond de retrait en % du profit. */
  maxPct: number | null;
}

export interface Trade {
  id: string;
  /** Date locale YYYY-MM-DD, sert aux agrégats journaliers. */
  tradeDate: string;
  closedAt: string | Date;
  pnl: number;
  fees?: number;
}

export type RuleState = 'ok' | 'warning' | 'danger' | 'passed' | 'failed';

export interface GaugeResult {
  value: number;
  limit: number;
  /** 0-1, directement exploitable pour une barre de progression. */
  ratio: number;
  state: RuleState;
  label: string;
}

export interface RuleEvaluation {
  balance: number;
  netProfit: number;

  dailyLoss: GaugeResult | null;
  drawdown: GaugeResult;
  profitTarget: GaugeResult | null;
  consistency: GaugeResult | null;

  tradingDays: { count: number; required: number; met: boolean };

  /** Sous ce solde, le compte est perdu. */
  drawdownFloor: number;
  highWaterMark: number;

  status: RuleState;
  /** Clés i18n, pas du texte affiché. */
  reasons: string[];
  canPass: boolean;
}

/** Résultat de l'évaluation d'une demande de retrait. */
export interface PayoutEvaluation {
  eligible: boolean;
  /** Montant retirable maintenant. */
  withdrawable: number;
  /** Ce qu'il manque pour être éligible. */
  missing: {
    profitDays: number;
    cycleProfit: number;
    buffer: number;
  };
  profitDays: { count: number; required: number; met: boolean };
  bufferGap: number;
  consistency: GaugeResult | null;
  blockers: string[];
}
