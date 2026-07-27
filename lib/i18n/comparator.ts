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

  tabEval: 'Éval',
  tabFunded: 'Financé',

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
  fPlatform: 'Plateforme',
  fSize: 'Taille de compte',
  fKind: 'Type de compte',
  fDrawdown: 'Type de drawdown',
  fDrawdownFunded: 'Drawdown en financé',
  fMaxPrice: 'Prix TTC maximum',
  fNoConsistency: 'Sans règle de cohérence',
  fVerifiedOnly: 'Règles vérifiées à la source',
  fNoHardening: 'Règles inchangées en financé',
  fSplit: 'Profit split minimum',
  fFrequency: 'Retrait au plus tard tous les',
  fNoFundedConsistency: 'Sans cohérence au retrait',
  fNewsAllowed: 'News non interdites',
  fAnySplit: 'Indifférent',
  fDays: 'jours',

  kindEvaluation: 'Évaluation',
  kindDirect: 'Financement direct',

  sort: 'Trier par',
  sortHealth: 'Fiabilité de la firm',
  sortTotalPrice: 'Prix TTC croissant',
  sortSize: 'Taille de compte',
  sortRating: 'Note',
  sortSplit: 'Profit split décroissant',

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
  colConsistencyFunded: 'Cohérence au retrait',
  colDrawdownFunded: 'Drawdown en financé',
  colSplit: 'Profit split',
  colCap: 'Plafond 1er retrait',
  colFrequency: 'Fréquence',
  colNews: 'News',

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

  /* ---- phase financée ---- */
  fundedIntro:
    'Les règles ci-dessous s’appliquent une fois le compte financé. Elles ne sont pas toujours celles de l’évaluation.',
  unknownValue: 'Non communiqué',
  unknownHint: 'La firm ne publie pas cette information, ou nous ne l’avons pas encore vérifiée.',
  noCap: 'Sans plafond',
  capVaries: 'puis davantage',
  capVariesHint: 'Le plafond change selon le numéro du retrait.',
  everyDays: 'tous les',
  twoPaths: 'deux chemins de retrait',
  twoPathsHint:
    'Cette offre propose plusieurs chemins de retrait aux règles différentes. Le choix est définitif.',
  splitTiersHint: 'Le partage évolue selon le numéro du retrait.',
  newsAllowed: 'Autorisées',
  newsRestricted: 'Restreintes',
  newsForbidden: 'Interdites',
  newsMonitored: 'Surveillées',

  /* ---- comparaison ---- */
  compare: 'Comparer',
  compareSelect: 'Sélectionner pour comparer',
  compareCount: 'sélectionnée(s)',
  compareOpen: 'Comparer la sélection',
  compareClose: 'Fermer',
  compareClear: 'Vider la sélection',
  compareHint: 'Sélectionne 2 à 4 offres.',
  compareOnlyDiff: 'Ne montrer que les différences',
  compareNothing: 'Aucune différence sur les critères affichés.',
  phasePrice: 'Prix',
  phaseEval: 'Évaluation',
  phaseFunded: 'Compte financé',
  phaseTrust: 'Confiance',
  rTotalPrice: 'Prix TTC',
  rPrice: 'Prix affiché',
  rActivation: 'Frais d’activation',
  rPromo: 'Code promo',
  rDrawdown: 'Drawdown',
  rLock: 'Plancher verrouillé au capital',
  rDailyLoss: 'Perte journalière max',
  rTarget: 'Objectif de profit',
  rConsistency: 'Cohérence (évaluation)',
  rMinDays: 'Jours de trading minimum',
  rHardening: 'Changement de règles en financé',
  rFundedDrawdown: 'Drawdown en financé',
  rFundedDailyLoss: 'Perte journalière en financé',
  rFundedConsistency: 'Cohérence (retrait)',
  rSplit: 'Profit split',
  rFirstCap: 'Plafond du 1er retrait',
  rFrequency: 'Fréquence de retrait (jours)',
  rMinProfitDays: 'Jours de profit requis',
  rBuffer: 'Buffer à conserver',
  rMethod: 'Méthode de paiement',
  rNews: 'Trading sur annonces',
  rHealth: 'Fiabilité de la firm',
  rRating: 'Note du plan',
  rReviewed: 'Règles vérifiées le',
  notApplicable: 'Sans objet',
  priceFloorHint:
    'Le prix est un abonnement mensuel : ce total est un minimum — un mois plus l’activation. Le coût réel dépend du nombre de mois passés en évaluation.',
  priceFrom: 'à partir de',
  perMonthPlusActivation: 'd’activation',

  /* ---- Ligne dépliable : libellés des sous-cartes ---- */
  expand: 'Voir le détail',
  collapse: 'Masquer le détail',
  founded: 'Créée en',
  sDailyLoss: 'Daily Loss Limit',
  sSizing: 'Sizing',
  sConsistency: 'Constance',
  sMinDays: 'Jours minimum',
  sScalping: 'Scalping',
  sMaxAccounts: 'Max comptes',
  sLicenses: 'Licence fournie',
  sBuffer: 'Buffer',
  sFirstCap: 'Plafond 1ᵉʳ retrait',
  sMethod: 'Méthode de retrait',
  sMinProfitDays: 'Jours de profit',
  sReviewed: 'Vérifié le',
  sMinis: 'minis',
  sMicros: 'micros',
  // Posture au masculin singulier (« le scalping »), distincte des annonces (fém. plur.).
  scAllowed: 'Autorisé',
  scRestricted: 'Restreint',
  scForbidden: 'Interdit',
  scMonitored: 'Surveillé',
  // Signal positif qu'aucun concurrent n'affiche : les règles ne durcissent pas.
  ddUnchanged: '= en financé',
  fSeeAll: 'Voir tout',
  fSeeLess: 'Réduire',
  journal: 'Journal',
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

  tabEval: 'Eval',
  tabFunded: 'Funded',

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
  fPlatform: 'Platform',
  fSize: 'Account size',
  fKind: 'Account type',
  fDrawdown: 'Drawdown type',
  fDrawdownFunded: 'Funded drawdown',
  fMaxPrice: 'Maximum total price',
  fNoConsistency: 'No consistency rule',
  fVerifiedOnly: 'Rules verified at source',
  fNoHardening: 'Rules unchanged when funded',
  fSplit: 'Minimum profit split',
  fFrequency: 'Payout at least every',
  fNoFundedConsistency: 'No consistency rule on payouts',
  fNewsAllowed: 'News trading not banned',
  fAnySplit: 'Any',
  fDays: 'days',

  kindEvaluation: 'Evaluation',
  kindDirect: 'Instant funding',

  sort: 'Sort by',
  sortHealth: 'Firm reliability',
  sortTotalPrice: 'Total price, lowest first',
  sortSize: 'Account size',
  sortRating: 'Rating',
  sortSplit: 'Profit split, highest first',

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
  colConsistencyFunded: 'Payout consistency',
  colDrawdownFunded: 'Funded drawdown',
  colSplit: 'Profit split',
  colCap: 'First payout cap',
  colFrequency: 'Frequency',
  colNews: 'News',

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

  fundedIntro:
    'The rules below apply once the account is funded. They are not always the evaluation rules.',
  unknownValue: 'Not published',
  unknownHint: 'The firm does not publish this, or we have not verified it yet.',
  noCap: 'No cap',
  capVaries: 'then higher',
  capVariesHint: 'The cap changes depending on the payout number.',
  everyDays: 'every',
  twoPaths: 'two payout paths',
  twoPathsHint:
    'This offer has several payout paths with different rules. The choice is permanent.',
  splitTiersHint: 'The split changes depending on the payout number.',
  newsAllowed: 'Allowed',
  newsRestricted: 'Restricted',
  newsForbidden: 'Banned',
  newsMonitored: 'Monitored',

  compare: 'Compare',
  compareSelect: 'Select to compare',
  compareCount: 'selected',
  compareOpen: 'Compare selection',
  compareClose: 'Close',
  compareClear: 'Clear selection',
  compareHint: 'Select 2 to 4 offers.',
  compareOnlyDiff: 'Show differences only',
  compareNothing: 'No difference on the criteria shown.',
  phasePrice: 'Price',
  phaseEval: 'Evaluation',
  phaseFunded: 'Funded account',
  phaseTrust: 'Trust',
  rTotalPrice: 'Total price',
  rPrice: 'Listed price',
  rActivation: 'Activation fee',
  rPromo: 'Promo code',
  rDrawdown: 'Drawdown',
  rLock: 'Floor locks at starting balance',
  rDailyLoss: 'Max daily loss',
  rTarget: 'Profit target',
  rConsistency: 'Consistency (evaluation)',
  rMinDays: 'Minimum trading days',
  rHardening: 'Rule change when funded',
  rFundedDrawdown: 'Funded drawdown',
  rFundedDailyLoss: 'Funded daily loss',
  rFundedConsistency: 'Consistency (payout)',
  rSplit: 'Profit split',
  rFirstCap: 'First payout cap',
  rFrequency: 'Payout frequency (days)',
  rMinProfitDays: 'Required profit days',
  rBuffer: 'Buffer to keep',
  rMethod: 'Payment method',
  rNews: 'News trading',
  rHealth: 'Firm reliability',
  rRating: 'Plan rating',
  rReviewed: 'Rules verified on',
  notApplicable: 'Not applicable',
  priceFloorHint:
    'The price is a monthly subscription: this total is a minimum — one month plus activation. The real cost depends on how many months the evaluation takes.',
  priceFrom: 'from',
  perMonthPlusActivation: 'activation',

  /* ---- Expandable row: sub-card labels ---- */
  expand: 'Show detail',
  collapse: 'Hide detail',
  founded: 'Founded',
  sDailyLoss: 'Daily Loss Limit',
  sSizing: 'Sizing',
  sConsistency: 'Consistency',
  sMinDays: 'Minimum days',
  sScalping: 'Scalping',
  sMaxAccounts: 'Max accounts',
  sLicenses: 'License provided',
  sBuffer: 'Buffer',
  sFirstCap: 'First payout cap',
  sMethod: 'Payout method',
  sMinProfitDays: 'Profit days',
  sReviewed: 'Verified on',
  sMinis: 'minis',
  sMicros: 'micros',
  scAllowed: 'Allowed',
  scRestricted: 'Restricted',
  scForbidden: 'Forbidden',
  scMonitored: 'Monitored',
  ddUnchanged: '= when funded',
  fSeeAll: 'See all',
  fSeeLess: 'Show less',
  journal: 'Journal',
};

export const DICTS: Record<Locale, Dict> = { fr, en };
export type ComparatorDict = Dict;
