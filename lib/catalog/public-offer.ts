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
  payout_min_days: number | null;
  reviewed_at: string | null;

  plan: { slug: string; name: string; account_kind: string; rating: number | null };
  firm: { slug: string; name: string; health_score: number | null };
  /** Promo active de la firm, si elle en a une. */
  promo?: { code: string; discount_pct: number | null; ends_at: string | null } | null;
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

const n = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

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
    hasConsistency: consistency !== null && consistency > 0 && consistency < 100,
    minTradingDays: Number(row.min_trading_days ?? 1),
    profitSplit: n(row.profit_split),

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
  drawdownTypes?: ('EOD' | 'TRAIL' | 'STATIC')[];
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
}

export function filterOffers(offers: PublicOffer[], f: OfferFilters): PublicOffer[] {
  return offers.filter((o) => {
    if (f.sizes?.length && !f.sizes.includes(o.size)) return false;
    if (f.drawdownTypes?.length && !f.drawdownTypes.includes(o.drawdown.type)) return false;
    if (f.kinds?.length && !f.kinds.includes(o.plan.kind)) return false;
    if (f.firms?.length && !f.firms.includes(o.firm.slug)) return false;
    if (f.noConsistency && o.hasConsistency) return false;
    if (f.verifiedOnly && !o.trust.verified) return false;
    if (f.noFundedHardening && o.fundedHardening.differs) return false;
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

export type SortKey = 'health' | 'total_price' | 'size' | 'rating';

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
    case 'health':
    default:
      /* Health score décroissant : la fiabilité de l'opérateur passe avant tout
         (§6). À score égal, la taille croissante donne un ordre stable. */
      return out.sort(
        (a, b) => descNullLast(a.firm.healthScore, b.firm.healthScore) || a.size - b.size,
      );
  }
}

/* ------------------------------------------------------------------ facettes */

/** Valeurs présentes dans le jeu, pour n'afficher que des filtres qui servent. */
export function buildFacets(offers: PublicOffer[]) {
  const sizes = [...new Set(offers.map((o) => o.size))].sort((a, b) => a - b);
  const drawdownTypes = [...new Set(offers.map((o) => o.drawdown.type))].sort();
  const kinds = [...new Set(offers.map((o) => o.plan.kind))].sort();
  const firms = [...new Map(offers.map((o) => [o.firm.slug, o.firm])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return {
    sizes,
    drawdownTypes,
    kinds,
    firms,
    withoutPrice: offers.filter((o) => !o.totalPrice.known).length,
    unverified: offers.filter((o) => !o.trust.verified).length,
    withPermanentPromo: offers.filter((o) => o.trust.promo?.permanent).length,
    withFundedHardening: offers.filter((o) => o.fundedHardening.differs).length,
  };
}
