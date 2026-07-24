import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * YRM Prop — collecte du 2026-07-21. La plus jeune firm de la collecte
 * (lancée en juin 2025), et celle qui accumule le plus de signaux de risque.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false,
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillé au capital initial
  profit_split: 90, // 90/10 dès le premier jour
  payout_model: 'fixed_cap',
  payout_frequency_days: 1, // payouts sous 24 h annoncés
  payout_daily_threshold: 150, // 150 $ de profit minimum par jour qualifiant
  payout_method: 'Rise',
  platforms: ['quantower', 'atas', 'volumetrica', 'tradesea', 'deepcharts'],
  price: null,
  confidence: 'verified',
  unverifiedFields: ['price'],
};

export const yrm: FirmSeed = {
  slug: 'yrm-prop',
  name: 'YRM Prop',
  collectedAt: '2026-07-21',
  founded_year: 2025,
  country: 'US',
  hq_city: 'New York',
  trustpilot_rating: 4.6,
  trustpilot_count: 175,
  max_funded_accounts: 3,

  platforms: [
    { slug: 'quantower', is_free: true },
    { slug: 'atas', is_free: true },
    { slug: 'volumetrica', is_free: true },
    { slug: 'tradesea', is_free: true },
    { slug: 'deepcharts', is_free: true },
  ],

  styleRules: [
    { rule_key: 'bots', stance: 'forbidden', detail: 'Bots et EA interdits.' },
  ],

  plans: [
    {
      slug: 'prime',
      name: 'YRM Prime',
      account_kind: 'evaluation',
      description: 'Six jours qualifiants à 150 $ minimum. Cohérence 35 % en compte financé.',
      offerDefaults: {
        ...BASE,
        // CORRECTION 2026-07-24 : les cartes officielles affichent
        // « Consistency : 50% » dans les Challenge Rules. Le fichier disait
        // « aucune cohérence en évaluation » — c'était faux, et une cohérence
        // absente est la plus permissive des erreurs possibles.
        consistency_pct: 50,
        funded_consistency_pct: 35,
        payout_min_days: 6,
        // Activation à 0 $ actuellement, 99 $ barré — la gratuité est promotionnelle.
        activation_fee: 0,
        // L'onglet « Funded Rules » de la page ne bascule pas : la cohérence
        // financée (35 %) n'a pas pu être relue à la source.
        unverifiedFields: ['funded_consistency_pct'],
      },
      offers: [
        {
          account_size: 25_000, price: 99, drawdown_amount: 1_000, profit_target: 1_500,
          max_minis: 2, max_micros: 20, confidence: 'verified',
          payoutCaps: [{ cycle_from: 1, cycle_to: 1, max_amount: 800, note: 'Plafond du premier payout' }],
        },
        {
          account_size: 50_000, price: 132, drawdown_amount: 2_000, profit_target: 3_000,
          max_minis: 5, max_micros: 50, confidence: 'verified',
          payoutCaps: [{ cycle_from: 1, cycle_to: 1, max_amount: 1_500, note: 'Plafond du premier payout' }],
        },
        { account_size: 100_000, price: 232, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 10, max_micros: 100, confidence: 'verified' },
        { account_size: 150_000, price: 298, drawdown_amount: 4_500, profit_target: 9_000, max_minis: 15, max_micros: 150, confidence: 'verified' },
      ],
    },
    {
      slug: 'instant-prime',
      name: 'YRM Instant Prime',
      account_kind: 'direct',
      description: 'Financement direct, règles plus strictes. Huit jours qualifiants, cohérence 20 %.',
      offerDefaults: {
        ...BASE,
        activation_fee: 99,
        profit_target: null,
        consistency_pct: 20,
        funded_consistency_pct: 20,
        payout_min_days: 8,
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 2_000, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, confidence: 'verified' },
        { account_size: 150_000, drawdown_amount: 4_500, confidence: 'verified' },
      ],
    },
  ],

  engineCaveats: [
    'Des « DLL souples » arrivent sur Prime et Instant Prime à partir du 50k : ni les seuils ni la nature (souple vs dure) ne sont établis — non saisis.',
    'Solde devant rester au-dessus du capital + 100 APRÈS demande de retrait : contrainte post-retrait, non modélisée.',
    'Division de grand-père au 2026-02-01 : les conditions de payout diffèrent entre anciens et nouveaux comptes — le schéma ne date pas les règles par cohorte.',
  ],
  riskFlags: [
    'Firm de moins d’un an, sans historique de stabilité.',
    'Avis Trustpilot de mai 2026 rapportant des délais de payout de 3 à 8 SEMAINES, alors que la firm annonce 24 heures.',
    'Des traders signalent avoir été marqués pour « schémas de trading automatisé » alors qu’ils tradaient manuellement.',
    'Un seul moyen de paiement (Rise), sans alternative. Plusieurs pays interdits.',
    'Positif : 1,72 M$ payés sur 938 transactions en dix mois ; dirigeants identifiés, issus de TradeZero.',
    '[PROMO] Remise permanente affichée : « Save 40% with JULY40 » sur chaque carte, prix barrés 99/132/232/298 → 59/79/139/179, et frais d’activation « $0 » barrant « $99 » (relevé 2026-07-24). AUCUNE date de fin. Prix catalogue = tarif de base ; l’activation gratuite est elle aussi promotionnelle.',
    'Prix de reset relevés (90/123/215/265 $ de base) : aucune colonne `reset_fee` au schéma (§12 #9).',
  ],
};
