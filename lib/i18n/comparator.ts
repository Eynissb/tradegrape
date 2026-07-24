/**
 * Dictionnaire du comparateur, FR + EN dès le premier jour (§2).
 *
 * Volontairement minimal et typé : `Dict` impose que toute clé ajoutée en
 * français existe aussi en anglais, sinon le build casse. Pas de bibliothèque
 * i18n tant qu'une seule page est traduite — mais la forme est prête à en
 * accueillir une sans réécrire les appels.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/** Segment d'URL du comparateur par langue — figé, c'est du SEO. */
export const COMPARATOR_PATH: Record<Locale, string> = { fr: 'comparateur', en: 'compare' };

export function comparatorHref(locale: Locale): string {
  return `/${locale}/${COMPARATOR_PATH[locale]}`;
}

const fr = {
  title: 'Comparateur de prop firms futures',
  metaTitle: 'Comparateur de prop firms futures — prix réels et règles vérifiées',
  metaDescription:
    'Compare les offres des prop firms futures sur leur prix TTC réel, leur drawdown et leurs règles de cohérence. Prix de base, jamais promotionnels. Données datées et vérifiées à la source.',
  intro:
    'Prix de base, jamais promotionnels. Règles vérifiées à la source et datées. Ce que nous ignorons est affiché comme inconnu.',

  tabEval: 'Évaluation',
  tabFunded: 'Compte financé',

  presets: 'Filtres rapides',
  preset_budget: 'Budget',
  preset_top_rated: 'Meilleures notes',
  preset_no_consistency: 'Sans cohérence',
  preset_beginner: 'Débutant',

  filters: 'Filtres',
  reset: 'Réinitialiser',
  results: 'offres',
  of: 'sur',
  hiddenNoPrice: 'masquée faute de prix publié',
  hiddenNoPricePlural: 'masquées faute de prix publié',

  fFirm: 'Prop firm',
  fSize: 'Taille de compte',
  fKind: 'Type de compte',
  fDrawdown: 'Type de drawdown',
  fMaxPrice: 'Prix TTC maximum',
  fNoConsistency: 'Sans règle de cohérence',
  fVerifiedOnly: 'Règles vérifiées à la source',
  fNoHardening: 'Règles inchangées en financé',

  kindEvaluation: 'Évaluation',
  kindDirect: 'Financement direct',

  sort: 'Trier par',
  sortHealth: 'Fiabilité de la firm',
  sortTotalPrice: 'Prix TTC croissant',
  sortSize: 'Taille de compte',
  sortRating: 'Note',

  colFirm: 'Prop firm',
  colPlan: 'Compte',
  colSize: 'Taille',
  colPrice: 'Prix TTC',
  colPromo: 'Code promo',
  colActivation: 'Activation',
  colPlatforms: 'Plateformes',
  colDrawdown: 'Drawdown',
  colTarget: 'Objectif',
  colRating: 'Note',
  colReviewed: 'Vérifié le',

  priceUnknown: 'Prix non communiqué',
  priceUnknownHint: 'La firm ne publie pas ce tarif publiquement.',
  perMonth: '/mois',
  oneTime: 'paiement unique',
  activationIncluded: 'Incluse',
  promoPermanent: 'Remise permanente',
  promoPermanentHint:
    'Cette remise est affichée en continu, sans date de fin. Ce n’est pas une offre limitée.',
  promoUntil: 'jusqu’au',
  notVerified: 'À vérifier',
  notVerifiedHint: 'Ces règles n’ont pas encore été confirmées sur le site officiel de la firm.',
  hardening: 'Règles durcies en financé',
  hardeningHint:
    'Cette offre change de règles une fois le compte financé — c’est la première cause de perte de compte.',
  notLocked: 'plancher non figé',
  notLockedHint:
    'Le plancher de drawdown continue de monter au-dessus du capital initial : il ne se verrouille jamais.',
  noConsistencyValue: 'aucune',

  emptyTitle: 'Aucune offre ne correspond',
  emptyBody: 'Élargis tes filtres, ou réinitialise-les.',
  noneTitle: 'Aucune offre publiée pour l’instant',
  noneBody:
    'Le catalogue est en cours de vérification. Une offre n’est publiée qu’une fois ses règles confirmées à la source.',

  generatedAt: 'Données générées le',
  healthScore: 'Fiabilité',
} as const;

/**
 * Les clés viennent du français (source), les valeurs sont de simples `string`.
 * Sans cet élargissement, le `as const` de `fr` figerait chaque valeur en type
 * littéral et l'anglais ne pourrait pas différer. La contrainte utile est
 * conservée : toute clé absente d'`en` casse le build.
 */
type Dict = { readonly [K in keyof typeof fr]: string };

const en: Dict = {
  title: 'Futures prop firm comparison',
  metaTitle: 'Futures prop firm comparison — real prices and verified rules',
  metaDescription:
    'Compare futures prop firm offers on real total price, drawdown type and consistency rules. Base prices, never promotional. Data dated and verified at source.',
  intro:
    'Base prices, never promotional. Rules verified at source and dated. What we do not know is shown as unknown.',

  tabEval: 'Evaluation',
  tabFunded: 'Funded account',

  presets: 'Quick filters',
  preset_budget: 'Budget',
  preset_top_rated: 'Top rated',
  preset_no_consistency: 'No consistency rule',
  preset_beginner: 'Beginner',

  filters: 'Filters',
  reset: 'Reset',
  results: 'offers',
  of: 'of',
  hiddenNoPrice: 'hidden — price not published',
  hiddenNoPricePlural: 'hidden — price not published',

  fFirm: 'Prop firm',
  fSize: 'Account size',
  fKind: 'Account type',
  fDrawdown: 'Drawdown type',
  fMaxPrice: 'Maximum total price',
  fNoConsistency: 'No consistency rule',
  fVerifiedOnly: 'Rules verified at source',
  fNoHardening: 'Rules unchanged when funded',

  kindEvaluation: 'Evaluation',
  kindDirect: 'Instant funding',

  sort: 'Sort by',
  sortHealth: 'Firm reliability',
  sortTotalPrice: 'Total price, lowest first',
  sortSize: 'Account size',
  sortRating: 'Rating',

  colFirm: 'Prop firm',
  colPlan: 'Account',
  colSize: 'Size',
  colPrice: 'Total price',
  colPromo: 'Promo code',
  colActivation: 'Activation',
  colPlatforms: 'Platforms',
  colDrawdown: 'Drawdown',
  colTarget: 'Target',
  colRating: 'Rating',
  colReviewed: 'Verified on',

  priceUnknown: 'Price not published',
  priceUnknownHint: 'The firm does not publish this price publicly.',
  perMonth: '/month',
  oneTime: 'one-time payment',
  activationIncluded: 'Included',
  promoPermanent: 'Permanent discount',
  promoPermanentHint:
    'This discount is shown continuously, with no end date. It is not a limited-time offer.',
  promoUntil: 'until',
  notVerified: 'Unverified',
  notVerifiedHint: 'These rules have not yet been confirmed on the firm’s official website.',
  hardening: 'Rules harden when funded',
  hardeningHint:
    'This offer changes its rules once the account is funded — the leading cause of losing a funded account.',
  notLocked: 'floor never locks',
  notLockedHint:
    'The drawdown floor keeps rising above the starting balance: it never locks.',
  noConsistencyValue: 'none',

  emptyTitle: 'No offer matches',
  emptyBody: 'Widen your filters, or reset them.',
  noneTitle: 'No offer published yet',
  noneBody:
    'The catalogue is being verified. An offer is only published once its rules are confirmed at source.',

  generatedAt: 'Data generated on',
  healthScore: 'Reliability',
};

export const DICTS: Record<Locale, Dict> = { fr, en };
export type ComparatorDict = Dict;
