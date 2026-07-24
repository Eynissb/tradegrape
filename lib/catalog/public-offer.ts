/**
 * Modèle d'affichage du comparateur public. Module PUR : ni réseau, ni DB, ni JSX.
 *
 * Sa raison d'être : rendre visible ce que le catalogue SAIT et ce qu'il ne sait
 * pas. Un prix absent n'est ni 0 ni une case vide — c'est une information en soi,
 * et le type `Known<T>` force l'appelant à la traiter.
 *
 * Trois signaux d'honnêteté sont calculés ici plutôt que dans le JSX, pour être
 * testables :
 *   1. prix inconnu          → `price.known === false`
 *   2. offre non vérifiée    → `trust.reviewedAt === null`
 *   3. remise sans échéance  → `trust.promo.permanent === true`
 */

/* --------------------------------------------------------------- Known<T> */

export type UnknownReason =
  /** La firm ne publie pas la donnée (prix en tunnel, page non lisible…). */
  | 'not_collected';

export type Known<T> =
  | { known: true; value: T }
  | { known: false; reason: UnknownReason };

export const known = <T>(value: T): Known<T> => ({ known: true, value });
export const unknown = (reason: UnknownReason = 'not_collected'): Known<never> => ({
  known: false,
  reason,
});

/** Lit une valeur connue, ou `null`. Jamais 0 par défaut : ce serait un mensonge. */
export function valueOf<T>(k: Known<T>): T | null {
  return k.known ? k.value : null;
}

/* ------------------------------------------------------------ ligne brute */

/** Ce que la requête publique ramène, à plat. */
export interface PublicOfferRow {
  id: string;
  account_size: number;
  currency: string | null;
  price: number | null;
  price_regular: number | null;
  activation_fee: number | null;
  is_recurring: boolean | null;

  drawdown_type: 'EOD' | 'TRAIL' | 'STATIC';
  drawdown_amount: number;
  drawdown_locks_at_breakeven: boolean | null;
  profit_target: number | null;
  daily_loss_limit: number | null;
  consistency_pct: number | null;
  min_trading_days: number | null;

  funded_drawdown_type: 'EOD' | 'TRAIL' | 'STATIC' | null;
  funded_drawdown_amount: number | null;
  funded_daily_loss: number | null;
  funded_consistency_pct: number | null;

  profit_split: number | null;
  payout_model: PayoutModel | null;
  payout_buffer: number | null;
  payout_min_amount: number | null;
  payout_frequency_days: number | null;
  payout_min_days: number | null;
  payout_method: string | null;
  /** Slugs du catalogue plateformes. */
  platforms?: string[] | null;
  reviewed_at: string | null;

  plan: { slug: string; name: string; account_kind: string; rating: number | null };
  firm: { slug: string; name: string; health_score: number | null };
  /** Promo active de la firm, si elle en a une. */
  promo?: { code: string; discount_pct: number | null; ends_at: string | null } | null;
  /** Plafonds par cycle de retrait, triés par `cycle_from` croissant. */
  payout_caps?: PayoutCapRow[] | null;
  /** Posture de la firm sur le trading pendant les annonces (`firm_style_rules`). */
  news_stance?: RuleStance | null;
  news_note?: string | null;
}

export type PayoutModel =
  | 'fixed_cap'
  | 'pct_profit'
  | 'progressive'
  | 'buffer_then_free'
  | 'unlimited';

export type RuleStance = 'allowed' | 'restricted' | 'forbidden' | 'monitored';

export interface PayoutCapRow {
  cycle_from: number;
  cycle_to: number | null;
  max_amount: number | null;
  max_pct: number | null;
  /** Chemin de payout, quand l'offre en propose plusieurs (Topstep, Tradeify). */
  variant: string | null;
  split_pct: number | null;
  consistency_pct: number | null;
  min_profit_days: number | null;
}

/* ------------------------------------------------------------- vue publique */

export interface PublicOffer {
  id: string;
  firm: { slug: string; name: string; healthScore: number | null };
  plan: { slug: string; name: string; kind: string; rating: number | null };

  size: number;
  currency: string;

  /** Prix affiché par la firm. Inconnu = la firm ne le publie pas. */
  price: Known<number>;
  /** Prix + frais d'activation — l'argument central du produit (§1, prix TTC réel). */
  totalPrice: Known<number>;
  /**
   * `true` quand le prix est un ABONNEMENT : le total n'est alors qu'un
   * plancher — un mois d'abonnement plus l'activation.
   *
   * Bulenox facture 535 $/mois jusqu'à validation, puis 898 $ d'activation.
   * Additionner les deux et écrire « 1 433 $/mois » serait faux deux fois :
   * l'activation n'est pas mensuelle, et le coût réel dépend du nombre de mois
   * passés en qualification — que personne ne connaît d'avance. On affiche donc
   * « à partir de », avec le détail des deux composantes.
   */
  totalPriceIsFloor: boolean;
  activationFee: number;
  /** Prix barré, quand la firm en affiche un. */
  priceRegular: number | null;
  isRecurring: boolean;

  drawdown: {
    type: 'EOD' | 'TRAIL' | 'STATIC';
    amount: number;
    /** false = le plancher continue de monter au-dessus du capital. */
    locksAtBreakeven: boolean;
  };
  /** Les règles changent-elles au passage en financé ? Notre signal n°1. */
  fundedHardening: {
    differs: boolean;
    drawdownType: 'EOD' | 'TRAIL' | 'STATIC' | null;
    drawdownAmount: number | null;
    dailyLoss: number | null;
  };

  profitTarget: number | null;
  dailyLossLimit: number | null;
  /** `null` ou 100 = aucune contrainte de cohérence. */
  consistencyPct: number | null;
  hasConsistency: boolean;
  minTradingDays: number;
  profitSplit: number | null;
  /** Slugs de plateformes ; résolus en noms à l'affichage. */
  platforms: string[];

  /** Tout ce qui ne s'applique QU'UNE FOIS le compte financé (onglet dédié). */
  funded: FundedView;

  trust: {
    /** `null` = règles jamais vérifiées à la source (§8). */
    reviewedAt: string | null;
    verified: boolean;
    promo: {
      code: string;
      discountPct: number | null;
      endsAt: string | null;
      /** Remise affichée en permanence, sans échéance — 7 firms sur 8. */
      permanent: boolean;
    } | null;
  };
}

/* ------------------------------------------------------- vue compte financé */

/**
 * L'onglet « Compte financé » ne montre PAS les mêmes règles que l'onglet
 * évaluation, et c'est tout l'intérêt : le concurrent affiche une seule colonne
 * « Cohérence » sans dire de quelle phase elle parle. Ici les deux phases sont
 * des jeux de champs distincts, et le durcissement est calculé (§12 #1).
 */
export interface FundedView {
  /** Drawdown RÉSOLU en phase financée — mêmes règles que `rulesForPhase`. */
  drawdown: { type: 'EOD' | 'TRAIL' | 'STATIC'; amount: number };
  dailyLossLimit: number | null;
  /** Cohérence appliquée AU RETRAIT, distincte de celle de l'évaluation. */
  consistencyPct: number | null;
  hasConsistency: boolean;

  profitSplit: number | null;
  /**
   * Split par palier, quand la firm en a plusieurs (TradeDay 50/50 puis 80/20,
   * Bulenox 100% puis 90/10…). Vide quand `profitSplit` suffit à décrire l'offre.
   */
  splitTiers: { fromCycle: number; splitPct: number }[];

  payoutModel: PayoutModel | null;
  /** Plafond du PREMIER cycle de retrait — le seul que le trader rencontre d'abord. */
  firstCap: Known<number | null>;
  /** `true` si le plafond change selon le cycle : « 2 000 puis plus ». */
  capVaries: boolean;
  buffer: number | null;
  minAmount: number | null;
  frequencyDays: number | null;
  minProfitDays: number | null;
  method: string | null;

  /**
   * Plusieurs chemins de payout pour la même offre (§12 #5) : Topstep Standard
   * ou Consistency, Tradeify Flex ou Daily. Le choix est définitif — l'afficher
   * évite de présenter une seule branche comme « la » règle.
   */
  payoutVariants: string[];

  news: { stance: RuleStance | null; note: string | null };
}

const n = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Une cohérence nulle, nulle en % ou à 100 % ne contraint rien. */
const constrains = (pct: number | null): boolean => pct !== null && pct > 0 && pct < 100;

function buildFunded(row: PublicOfferRow): FundedView {
  const caps = [...(row.payout_caps ?? [])].sort((a, b) => a.cycle_from - b.cycle_from);

  /* Les variantes partagent une clé (§12 #5). On ne garde que les lignes de la
     première variante pour décrire le plafond, sinon deux chemins concurrents
     produiraient un « le plafond varie » qui n'est qu'un artefact de lecture. */
  const variants = [...new Set(caps.map((c) => c.variant).filter((v): v is string => !!v))];
  const primary = variants.length ? caps.filter((c) => c.variant === variants[0]) : caps;

  const amounts = primary.map((c) => n(c.max_amount)).filter((v): v is number => v !== null);
  const first = primary[0] ?? null;

  /* Un plafond absent n'est PAS « illimité » : c'est une donnée non collectée.
     Seul le modèle `unlimited`, ou une ligne de cycle explicite sans montant,
     autorise à dire qu'il n'y a pas de plafond. `null` sous `known` se lit
     « pas de plafond » ; `unknown` se lit « on ne sait pas ». */
  const firstCap: Known<number | null> =
    row.payout_model === 'unlimited'
      ? known(null)
      : caps.length === 0
        ? unknown()
        : known(n(first?.max_amount ?? null));

  const splitTiers = primary
    .filter((c) => n(c.split_pct) !== null)
    .map((c) => ({ fromCycle: c.cycle_from, splitPct: n(c.split_pct) as number }));

  /* Cohérence funded : la valeur par cycle (0013) prime sur le scalaire de
     l'offre quand elle existe — Tradeify Lightning monte 20 → 25 → 30 %. */
  const cycleConsistency = n(first?.consistency_pct ?? null);
  const consistencyPct = cycleConsistency ?? n(row.funded_consistency_pct);

  return {
    drawdown: {
      type: row.funded_drawdown_type ?? row.drawdown_type,
      amount: n(row.funded_drawdown_amount) ?? Number(row.drawdown_amount),
    },
    dailyLossLimit: n(row.funded_daily_loss) ?? n(row.daily_loss_limit),
    consistencyPct,
    hasConsistency: constrains(consistencyPct),

    profitSplit: n(row.profit_split),
    splitTiers: splitTiers.length > 1 ? splitTiers : [],

    payoutModel: row.payout_model ?? null,
    firstCap,
    capVaries: new Set(amounts).size > 1,
    buffer: n(row.payout_buffer),
    minAmount: n(row.payout_min_amount),
    frequencyDays: row.payout_frequency_days ?? null,
    minProfitDays: n(first?.min_profit_days ?? null) ?? row.payout_min_days ?? null,
    method: row.payout_method ?? null,

    payoutVariants: variants,

    news: { stance: row.news_stance ?? null, note: row.news_note ?? null },
  };
}

export function toPublicOffer(row: PublicOfferRow): PublicOffer {
  const price = row.price === null ? unknown() : known(Number(row.price));
  const activationFee = Number(row.activation_fee ?? 0);

  /* Sans prix connu, PAS de total : additionner les seuls frais d'activation
     produirait un nombre qui se lirait comme un prix. Même règle que la
     fonction SQL `offer_total_price`. */
  const totalPrice: Known<number> = price.known
    ? known(price.value + activationFee)
    : unknown();

  const fundedType = row.funded_drawdown_type;
  const fundedAmount = n(row.funded_drawdown_amount);
  const fundedDll = n(row.funded_daily_loss);
  const differs =
    (fundedType !== null && fundedType !== row.drawdown_type) ||
    (fundedAmount !== null && fundedAmount !== Number(row.drawdown_amount)) ||
    (fundedDll !== null && fundedDll !== n(row.daily_loss_limit));

  const consistency = n(row.consistency_pct);

  return {
    id: row.id,
    firm: { slug: row.firm.slug, name: row.firm.name, healthScore: n(row.firm.health_score) },
    plan: {
      slug: row.plan.slug,
      name: row.plan.name,
      kind: row.plan.account_kind,
      rating: n(row.plan.rating),
    },
    size: Number(row.account_size),
    currency: row.currency ?? 'USD',

    price,
    totalPrice,
    totalPriceIsFloor: row.is_recurring === true && price.known && activationFee > 0,
    activationFee,
    priceRegular: n(row.price_regular),
    isRecurring: row.is_recurring === true,

    drawdown: {
      type: row.drawdown_type,
      amount: Number(row.drawdown_amount),
      locksAtBreakeven: row.drawdown_locks_at_breakeven !== false,
    },
    fundedHardening: {
      differs,
      drawdownType: fundedType,
      drawdownAmount: fundedAmount,
      dailyLoss: fundedDll,
    },

    profitTarget: n(row.profit_target),
    dailyLossLimit: n(row.daily_loss_limit),
    consistencyPct: consistency,
    // 100 % signifie « aucun jour ne peut dépasser 100 % du profit » : sans effet.
    hasConsistency: constrains(consistency),
    minTradingDays: Number(row.min_trading_days ?? 1),
    profitSplit: n(row.profit_split),
    platforms: row.platforms ?? [],

    funded: buildFunded(row),

    trust: {
      reviewedAt: row.reviewed_at,
      verified: row.reviewed_at !== null,
      promo: row.promo
        ? {
            code: row.promo.code,
            discountPct: n(row.promo.discount_pct),
            endsAt: row.promo.ends_at,
            permanent: row.promo.ends_at === null,
          }
        : null,
    },
  };
}

/* ----------------------------------------------------------------- filtres */

export interface OfferFilters {
  sizes?: number[];
  /** Type de drawdown en ÉVALUATION. */
  drawdownTypes?: ('EOD' | 'TRAIL' | 'STATIC')[];
  /**
   * Type de drawdown UNE FOIS FINANCÉ. Filtre distinct, et non un alias : une
   * offre EOD en évaluation peut être TRAIL en financé (TPT, TradeDay, MFF).
   * Confondre les deux ferait exactement l'erreur que le produit dénonce.
   */
  fundedDrawdownTypes?: ('EOD' | 'TRAIL' | 'STATIC')[];
  kinds?: string[];
  firms?: string[];
  /** Plafond de prix TTC. Les offres SANS prix sont écartées (cf. tests). */
  maxTotalPrice?: number;
  /** Ne garder que les offres sans contrainte de cohérence. */
  noConsistency?: boolean;
  /** Ne garder que les offres dont les règles sont vérifiées à la source. */
  verifiedOnly?: boolean;
  /** Ne garder que celles qui ne durcissent PAS leurs règles en financé. */
  noFundedHardening?: boolean;

  /* ---- phase financée ---- */
  /** Split minimum accordé au trader, en %. */
  minProfitSplit?: number;
  /** Ne garder que les offres sans cohérence AU RETRAIT. */
  noFundedConsistency?: boolean;
  /** Délai maximum entre deux retraits, en jours. */
  maxPayoutFrequencyDays?: number;
  /** Ne garder que les firms qui n'interdisent pas le trading sur annonces. */
  newsAllowed?: boolean;
}

export function filterOffers(offers: PublicOffer[], f: OfferFilters): PublicOffer[] {
  return offers.filter((o) => {
    if (f.sizes?.length && !f.sizes.includes(o.size)) return false;
    if (f.drawdownTypes?.length && !f.drawdownTypes.includes(o.drawdown.type)) return false;
    if (f.fundedDrawdownTypes?.length && !f.fundedDrawdownTypes.includes(o.funded.drawdown.type))
      return false;
    if (f.kinds?.length && !f.kinds.includes(o.plan.kind)) return false;
    if (f.firms?.length && !f.firms.includes(o.firm.slug)) return false;
    if (f.noConsistency && o.hasConsistency) return false;
    if (f.verifiedOnly && !o.trust.verified) return false;
    if (f.noFundedHardening && o.fundedHardening.differs) return false;

    /* Filtres de phase financée. Même règle que le prix : une donnée absente ne
       satisfait pas un seuil. Écarter est honnête, inclure serait une promesse. */
    if (f.minProfitSplit != null) {
      if (o.funded.profitSplit === null) return false;
      if (o.funded.profitSplit < f.minProfitSplit) return false;
    }
    if (f.noFundedConsistency && o.funded.hasConsistency) return false;
    if (f.maxPayoutFrequencyDays != null) {
      if (o.funded.frequencyDays === null) return false;
      if (o.funded.frequencyDays > f.maxPayoutFrequencyDays) return false;
    }
    /* « News autorisées » : seul `forbidden` exclut. `restricted` et `monitored`
       laissent trader sous conditions — les écarter serait trop sévère, et un
       `null` (posture non collectée) ne doit pas se lire comme une interdiction. */
    if (f.newsAllowed && o.funded.news.stance === 'forbidden') return false;

    if (f.maxTotalPrice != null) {
      /* Un prix inconnu ne peut PAS satisfaire « moins de X ». L'écarter est le
         choix honnête : le présenter comme éligible laisserait croire qu'il
         tient dans le budget. Le compteur d'offres masquées le dit à l'écran. */
      if (!o.totalPrice.known) return false;
      if (o.totalPrice.value > f.maxTotalPrice) return false;
    }
    return true;
  });
}

/** Offres écartées par le filtre de prix faute de tarif publié. */
export function hiddenByUnknownPrice(offers: PublicOffer[], f: OfferFilters): number {
  if (f.maxTotalPrice == null) return 0;
  const rest: OfferFilters = { ...f, maxTotalPrice: undefined };
  return filterOffers(offers, rest).filter((o) => !o.totalPrice.known).length;
}

/* -------------------------------------------------------------------- tri */

export type SortKey = 'health' | 'total_price' | 'size' | 'rating' | 'split';

/**
 * Comparateurs gardant les valeurs inconnues EN DERNIER, dans les deux sens.
 *
 * Deux fonctions plutôt qu'un paramètre de direction : inverser les arguments
 * pour obtenir un tri décroissant inverse aussi la règle des `null`, et les
 * inconnus remontent alors en tête. C'est le bug qu'un test a attrapé ici.
 */
const ascNullLast = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const descNullLast = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

/**
 * Tri du comparateur. Par défaut le health score (§7 : jamais par commission).
 *
 * ⚠️ `total_price` : une offre SANS prix ne vaut pas 0 — elle serait alors en
 * tête d'un tri « moins cher », ce qui est exactement le mensonge que le produit
 * refuse. Les inconnus sont donc renvoyés en fin de liste, quel que soit le sens.
 */
export function sortOffers(offers: PublicOffer[], key: SortKey = 'health'): PublicOffer[] {
  const out = [...offers];
  switch (key) {
    case 'total_price':
      return out.sort(
        (a, b) => ascNullLast(valueOf(a.totalPrice), valueOf(b.totalPrice)) || a.size - b.size,
      );
    case 'size':
      return out.sort((a, b) => a.size - b.size);
    case 'rating':
      return out.sort((a, b) => descNullLast(a.plan.rating, b.plan.rating) || a.size - b.size);
    case 'split':
      return out.sort(
        (a, b) => descNullLast(a.funded.profitSplit, b.funded.profitSplit) || a.size - b.size,
      );
    case 'health':
    default:
      /* Health score décroissant : la fiabilité de l'opérateur passe avant tout
         (§6). À score égal, la taille croissante donne un ordre stable. */
      return out.sort(
        (a, b) => descNullLast(a.firm.healthScore, b.firm.healthScore) || a.size - b.size,
      );
  }
}

/* ------------------------------------------------------------------ presets */

/**
 * Filtres en un clic. Un comparateur avec vingt filtres n'est pas utilisable :
 * les presets couvrent les intentions réelles d'arrivée.
 *
 * Ils vivent ici, et non dans le JSX, pour être testables — et pour que leur
 * définition soit un choix éditorial explicite plutôt qu'un détail d'interface.
 */
export interface Preset {
  key: string;
  filters: OfferFilters;
  sort: SortKey;
}

export const PRESETS: readonly Preset[] = [
  /* « Budget » : prix TTC réel sous 150, trié du moins cher au plus cher.
     Les offres sans prix publié sont écartées et comptées à l'écran. */
  { key: 'budget', filters: { maxTotalPrice: 150 }, sort: 'total_price' },

  /* « Meilleures notes » : tri par notation éditoriale du plan. On n'impose pas
     `verifiedOnly` — ce serait mélanger la qualité de l'offre et l'état de notre
     propre collecte. */
  { key: 'top_rated', filters: {}, sort: 'rating' },

  /* « Sans cohérence » : la règle qui fait le plus échouer les payouts. */
  { key: 'no_consistency', filters: { noConsistency: true }, sort: 'health' },

  /* « Débutant » : EOD (le plus indulgent), aucune cohérence, et surtout AUCUN
     durcissement en financé — un débutant ne doit pas découvrir un trailing
     intraday après avoir passé son éval en EOD. */
  {
    key: 'beginner',
    filters: { drawdownTypes: ['EOD'], noConsistency: true, noFundedHardening: true },
    sort: 'health',
  },
] as const;

export function presetByKey(key: string): Preset | null {
  return PRESETS.find((p) => p.key === key) ?? null;
}

/* ------------------------------------------------------------------ facettes */

/** Valeurs présentes dans le jeu, pour n'afficher que des filtres qui servent. */
export function buildFacets(offers: PublicOffer[]) {
  const sizes = [...new Set(offers.map((o) => o.size))].sort((a, b) => a - b);
  const drawdownTypes = [...new Set(offers.map((o) => o.drawdown.type))].sort();
  const fundedDrawdownTypes = [...new Set(offers.map((o) => o.funded.drawdown.type))].sort();
  const kinds = [...new Set(offers.map((o) => o.plan.kind))].sort();
  const firms = [...new Map(offers.map((o) => [o.firm.slug, o.firm])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  /* Facettes de phase financée. Les paliers de split proposés sont ceux qui
     existent réellement dans le jeu, arrondis vers le bas au dizainier : un
     filtre « ≥ 87 % » n'aurait aucun sens pour un lecteur. */
  const splits = [...new Set(offers.map((o) => o.funded.profitSplit).filter((v): v is number => v !== null))];
  const splitSteps = [...new Set(splits.map((s) => Math.floor(s / 10) * 10))]
    .filter((s) => s >= 50)
    .sort((a, b) => a - b);
  const frequencies = [
    ...new Set(offers.map((o) => o.funded.frequencyDays).filter((v): v is number => v !== null)),
  ].sort((a, b) => a - b);

  return {
    sizes,
    drawdownTypes,
    fundedDrawdownTypes,
    kinds,
    firms,
    splitSteps,
    frequencies,
    withoutPrice: offers.filter((o) => !o.totalPrice.known).length,
    unverified: offers.filter((o) => !o.trust.verified).length,
    withPermanentPromo: offers.filter((o) => o.trust.promo?.permanent).length,
    withFundedHardening: offers.filter((o) => o.fundedHardening.differs).length,
    withoutSplit: offers.filter((o) => o.funded.profitSplit === null).length,
    withoutNewsStance: offers.filter((o) => o.funded.news.stance === null).length,
  };
}

/* ------------------------------------------------------- comparaison 2 à 4 */

/**
 * Comparaison côte à côte. La sélection est bornée à 4 : au-delà, les colonnes
 * deviennent illisibles et l'écran ne sert plus à décider.
 */
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export function toggleCompare(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((s) => s !== id);
  if (selected.length >= COMPARE_MAX) return [...selected];
  return [...selected, id];
}

export type CompareCell =
  /** Valeur connue, déjà réduite à ce qui doit s'afficher. */
  | { kind: 'value'; text: string; tone?: 'ok' | 'warn' | 'bad' }
  /** La firm ne publie pas la donnée — jamais rendu par une case vide. */
  | { kind: 'unknown' }
  /** La donnée ne s'applique pas à cette offre (pas d'activation, etc.). */
  | { kind: 'none' };

/**
 * Lignes du comparatif, dans l'ordre d'affichage.
 *
 * Liste figée et exportée : l'écran type son dictionnaire de libellés sur elle,
 * donc ajouter une ligne sans la traduire **casse le build** plutôt que de
 * rendre une clé brute à l'écran. Même intention que le registre de colonnes
 * mortes (§8) — une donnée affichée doit être une donnée décidée.
 */
export const COMPARE_ROW_KEYS = [
  'totalPrice', 'price', 'activation', 'promo',
  'drawdown', 'lock', 'dailyLoss', 'target', 'consistency', 'minDays',
  'hardening', 'fundedDrawdown', 'fundedDailyLoss', 'fundedConsistency', 'split',
  'firstCap', 'frequency', 'minProfitDays', 'buffer', 'method', 'news',
  'health', 'rating', 'reviewed',
] as const;

export type CompareRowKey = (typeof COMPARE_ROW_KEYS)[number];

export interface CompareRow {
  key: CompareRowKey;
  /** Phase concernée : la comparaison ne mélange pas les deux (§ le concurrent si). */
  phase: 'price' | 'eval' | 'funded' | 'trust';
  cells: CompareCell[];
  /**
   * `true` si les offres ne donnent pas toutes la même valeur. C'est le seul
   * intérêt d'un comparatif : montrer où elles diffèrent réellement.
   */
  differs: boolean;
  /**
   * Ligne décisive, mise en relief par l'UI même si l'option « seulement les
   * différences » est active. Réservé au durcissement du drawdown en financé :
   * c'est LE piège que la comparaison côte à côte rend le plus lisible — une
   * offre qui passe EOD→trailing à côté d'une qui ne bouge pas.
   */
  pivotal?: boolean;
}

const cellKey = (c: CompareCell): string =>
  c.kind === 'value' ? `v:${c.text}` : c.kind;

/**
 * Formatage injecté : le module reste pur et ignore la locale. Les enrobages
 * (`floor`, `varies`) et la traduction des postures sont fournis par l'écran —
 * sinon une valeur d'enum brute finirait affichée à l'utilisateur.
 */
export interface CompareFormat {
  num: (v: number) => string;
  money: (v: number, currency: string) => string;
  /** Enrobe un total qui n'est qu'un plancher : « à partir de 288 USD ». */
  floor: (text: string) => string;
  /** Enrobe un plafond qui change selon le cycle : « 2 000 USD, puis davantage ». */
  varies: (text: string) => string;
  /** Traduit une posture de règle de style. */
  stance: (s: RuleStance) => string;
  /** Suffixe signalant une remise sans échéance : « TG40 −40 % · permanente ». */
  permanentPromo: (text: string) => string;
  /** Libellé d'une offre non vérifiée à la source (reviewed_at NULL). */
  pending: string;
}

/** Construit les lignes du comparatif. */
export function buildCompareRows(offers: PublicOffer[], fmt: CompareFormat): CompareRow[] {
  const V = (text: string, tone?: 'ok' | 'warn' | 'bad'): CompareCell => ({ kind: 'value', text, tone });
  const U: CompareCell = { kind: 'unknown' };
  const N: CompareCell = { kind: 'none' };

  const row = (
    key: CompareRowKey,
    phase: CompareRow['phase'],
    cells: CompareCell[],
    pivotal = false,
  ): CompareRow => ({
    key,
    phase,
    cells,
    differs: new Set(cells.map(cellKey)).size > 1,
    pivotal,
  });

  const each = (fn: (o: PublicOffer) => CompareCell): CompareCell[] => offers.map(fn);
  const money = (o: PublicOffer, v: number) => fmt.money(v, o.currency);
  const pct = (v: number | null): CompareCell => (v === null ? U : V(`${fmt.num(v)} %`));
  const days = (v: number | null): CompareCell => (v === null ? U : V(fmt.num(v)));

  return [
    /* ---- prix ---- */
    row('totalPrice', 'price', each((o) => {
      if (!o.totalPrice.known) return U;
      const t = money(o, o.totalPrice.value);
      return V(o.totalPriceIsFloor ? fmt.floor(t) : t);
    })),
    row('price', 'price', each((o) => (o.price.known ? V(money(o, o.price.value)) : U))),
    row('activation', 'price', each((o) =>
      o.activationFee === 0 ? N : V(money(o, o.activationFee)),
    )),
    row('promo', 'price', each((o) => {
      const p = o.trust.promo;
      if (!p) return N;
      const base = p.code + (p.discountPct != null ? ` −${fmt.num(p.discountPct)} %` : '');
      // Remise sans échéance : signalée en toutes lettres, pas seulement colorée.
      return V(p.permanent ? fmt.permanentPromo(base) : base, p.permanent ? 'warn' : undefined);
    })),

    /* ---- évaluation ---- */
    row('drawdown', 'eval', each((o) =>
      V(`${o.drawdown.type} ${fmt.num(o.drawdown.amount)}`, o.drawdown.type === 'TRAIL' ? 'warn' : undefined),
    )),
    row('lock', 'eval', each((o) => (o.drawdown.locksAtBreakeven ? V('oui', 'ok') : V('non', 'bad')))),
    row('dailyLoss', 'eval', each((o) =>
      o.dailyLossLimit === null ? N : V(fmt.num(o.dailyLossLimit)),
    )),
    row('target', 'eval', each((o) => (o.profitTarget === null ? U : V(fmt.num(o.profitTarget))))),
    /* Une cohérence à 100 % n'interdit rien : la rendre comme une contrainte
       ferait craindre une règle qui n'existe pas. Même traitement qu'à l'écran. */
    row('consistency', 'eval', each((o) =>
      o.hasConsistency ? V(`${fmt.num(o.consistencyPct as number)} %`, 'warn') : N,
    )),
    row('minDays', 'eval', each((o) => V(fmt.num(o.minTradingDays)))),

    /* ---- compte financé ---- */
    /* Ligne pivot : le durcissement est la révélation la plus forte d'un côte à
       côte. `pivotal` la garde visible et mise en relief même en mode
       « différences seulement ». */
    row(
      'hardening',
      'funded',
      each((o) =>
        o.fundedHardening.differs
          ? V(`${o.drawdown.type} → ${o.funded.drawdown.type}`, 'bad')
          : V('inchangées', 'ok'),
      ),
      true,
    ),
    row('fundedDrawdown', 'funded', each((o) =>
      V(`${o.funded.drawdown.type} ${fmt.num(o.funded.drawdown.amount)}`),
    )),
    row('fundedDailyLoss', 'funded', each((o) =>
      o.funded.dailyLossLimit === null ? N : V(fmt.num(o.funded.dailyLossLimit)),
    )),
    row('fundedConsistency', 'funded', each((o) =>
      o.funded.hasConsistency ? V(`${fmt.num(o.funded.consistencyPct as number)} %`, 'warn') : N,
    )),
    row('split', 'funded', each((o) =>
      o.funded.splitTiers.length
        ? V(o.funded.splitTiers.map((t) => `${fmt.num(t.splitPct)} %`).join(' → '))
        : pct(o.funded.profitSplit),
    )),
    row('firstCap', 'funded', each((o) => {
      if (!o.funded.firstCap.known) return U;
      // `null` sous `known` = pas de plafond du tout, et c'est une bonne nouvelle.
      if (o.funded.firstCap.value === null) return N;
      const t = money(o, o.funded.firstCap.value);
      return V(o.funded.capVaries ? fmt.varies(t) : t);
    })),
    row('frequency', 'funded', each((o) => days(o.funded.frequencyDays))),
    row('minProfitDays', 'funded', each((o) => days(o.funded.minProfitDays))),
    row('buffer', 'funded', each((o) => (o.funded.buffer === null ? N : V(money(o, o.funded.buffer))))),
    row('method', 'funded', each((o) => (o.funded.method ? V(o.funded.method) : U))),
    row('news', 'funded', each((o) => {
      const s = o.funded.news.stance;
      if (s === null) return U;
      return V(fmt.stance(s), s === 'forbidden' ? 'bad' : s === 'allowed' ? 'ok' : 'warn');
    })),

    /* ---- confiance ---- */
    row('health', 'trust', each((o) =>
      o.firm.healthScore === null ? U : V(fmt.num(o.firm.healthScore)),
    )),
    row('rating', 'trust', each((o) => (o.plan.rating === null ? U : V(String(o.plan.rating))))),
    /* `reviewed_at` NULL ≠ « la firm ne publie pas » : c'est « pas encore
       vérifié par nous ». Même libellé que le badge du tableau. */
    row('reviewed', 'trust', each((o) =>
      o.trust.reviewedAt ? V(o.trust.reviewedAt, 'ok') : V(fmt.pending, 'warn'),
    )),
  ];
}
