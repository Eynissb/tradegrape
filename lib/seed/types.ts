/**
 * Modèle de la collecte catalogue (firms → plans → offres + tables enfants).
 *
 * Deux principes structurants :
 *
 * 1. LA CONFIANCE EST PORTÉE PAR LA DONNÉE. Chaque offre déclare si ses règles
 *    ont été vérifiées à la source. Une offre non vérifiée reçoit
 *    `reviewed_at = null` en base : « qu'est-ce qu'on doit revérifier ? »
 *    devient `where reviewed_at is null`, et l'admin affiche déjà l'alerte
 *    « publiée mais jamais vérifiée à la source » (§8).
 *
 * 2. ON N'INVENTE RIEN. Un prix inconnu reste `null` (≠ 0 = gratuit). Une règle
 *    que le moteur modéliserait faussement reste `null` plutôt que d'afficher
 *    un faux positif — cf. `engineCaveats`.
 */

export type Confidence =
  /** Source officielle de la firm, vérifiée à la date de collecte. */
  | 'verified'
  /** Repris d'un tiers (comparateur concurrent) ou source unique : à revérifier. */
  | 'unverified';

export interface OfferSeed {
  account_size: number;
  /** `null` = prix non établi. Jamais 0 pour « inconnu ». */
  price?: number | null;
  price_regular?: number | null;
  activation_fee?: number | null;
  currency?: string;
  /** Abonnement récurrent (Topstep, TPT, FFN, Bulenox, MFF) vs paiement unique. */
  is_recurring?: boolean;

  drawdown_type: 'EOD' | 'TRAIL' | 'STATIC';
  drawdown_amount: number;
  /** false uniquement si la firm laisse le plancher monter au-dessus du capital. */
  drawdown_locks_at_breakeven?: boolean;
  profit_target?: number | null;
  daily_loss_limit?: number | null;
  consistency_pct?: number | null;
  min_trading_days?: number | null;
  max_minis?: number | null;
  max_micros?: number | null;

  funded_drawdown_type?: 'EOD' | 'TRAIL' | 'STATIC' | null;
  funded_daily_loss?: number | null;
  funded_consistency_pct?: number | null;
  funded_max_minis?: number | null;
  funded_max_micros?: number | null;

  profit_split?: number | null;
  payout_model?: string | null;
  payout_buffer?: number | null;
  payout_min_amount?: number | null;
  payout_frequency_days?: number | null;
  payout_min_days?: number | null;
  payout_daily_threshold?: number | null;
  payout_method?: string | null;

  /** Slugs du catalogue plateformes (cf. data/catalog/platforms.ts). */
  platforms?: string[];

  /** Confiance de CETTE offre. Pilote `reviewed_at`. */
  confidence: Confidence;
  /** Champs précis à revérifier, même sur une offre globalement fiable. */
  unverifiedFields?: string[];
  /** Pourquoi cette offre est marquée à vérifier (source, contradiction…). */
  note?: string;
}

/**
 * Offre telle qu'ELLE EST ÉCRITE dans la collecte : seules la taille et la
 * confiance sont obligatoires, le reste peut venir de `offerDefaults` du plan.
 * `resolveOffer` fusionne les deux et rend une `OfferSeed` complète.
 */
export type OfferInput = Partial<OfferSeed> & {
  account_size: number;
  confidence: Confidence;
};

export interface PayoutCapSeed {
  /** Chemin de payout (Topstep standard|consistency, Tradeify flex|daily). */
  variant?: string | null;
  cycle_from?: number;
  cycle_to?: number | null;
  max_amount?: number | null;
  max_pct?: number | null;
  min_profit?: number | null;
  split_pct?: number | null;
  consistency_pct?: number | null;
  min_profit_days?: number | null;
  daily_threshold?: number | null;
  note?: string | null;
}

export interface ScalingStepSeed {
  profit_from: number;
  profit_to?: number | null;
  max_minis?: number | null;
  max_micros?: number | null;
  phase?: 'funded' | 'evaluation';
}

export interface PlanSeed {
  slug: string;
  name: string;
  account_kind?: 'evaluation' | 'direct';
  description?: string | null;
  rating?: number | null;
  rating_note?: string | null;
  /** Valeurs communes fusionnées dans chaque offre (réduit la répétition). */
  offerDefaults?: Partial<OfferSeed>;
  offers: OfferInput[];
  /** Plafonds par cycle, appliqués à TOUTES les offres du plan. */
  payoutCaps?: PayoutCapSeed[];
  scalingSteps?: ScalingStepSeed[];
}

export interface StyleRuleSeed {
  rule_key: string;
  stance: 'allowed' | 'restricted' | 'forbidden' | 'monitored';
  threshold_note?: string | null;
  detail?: string | null;
}

export interface CommissionSeed {
  asset_class: string;
  round_turn: number;
  symbols?: string[];
  note?: string | null;
}

export interface FirmPlatformSeed {
  /** Slug du catalogue plateformes. */
  slug: string;
  is_free?: boolean;
  extra_cost?: number | null;
  note?: string | null;
}

export interface FirmSeed {
  slug: string;
  name: string;
  /** Date RÉELLE de collecte, pas la date du seed. Pilote `reviewed_at`. */
  collectedAt: string;

  website_url?: string | null;
  support_url?: string | null;
  discord_url?: string | null;
  trustpilot_rating?: number | null;
  trustpilot_count?: number | null;
  founded_year?: number | null;
  country?: string | null;
  hq_city?: string | null;

  /** 0-100. Bas = signaux de risque opérateur avérés. */
  health_score?: number | null;
  health_breakdown?: Record<string, unknown> | null;

  max_funded_accounts?: number | null;
  max_eval_accounts?: number | null;
  inactivity_days?: number | null;
  restricted_countries?: string[];
  collects_eu_vat?: boolean;
  daily_flat_time?: string | null;
  overnight_allowed?: boolean | null;
  weekend_allowed?: boolean | null;

  styleRules?: StyleRuleSeed[];
  commissions?: CommissionSeed[];
  platforms?: FirmPlatformSeed[];
  plans: PlanSeed[];

  /**
   * Mécanismes RÉELS que le moteur ne modélise pas encore. Documentés ici pour
   * qu'on sache pourquoi une règle a été laissée à `null` plutôt que saisie
   * faussement — et pour alimenter §12.
   */
  engineCaveats?: string[];
  /** Alertes opérateur destinées au health score / firm_events (§10, §12 #10). */
  riskFlags?: string[];
}
