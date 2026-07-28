import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Bulenox — collecte du 2026-07-21.
 * Structure en TROIS étapes : Qualification → Master (simulé, payouts réels)
 * → Funded (capital réel) après trois payouts Master validés.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: true, // abonnement mensuel en qualification
  drawdown_locks_at_breakeven: true, // verrouillage au capital + 100 ; le DLL disparaît alors
  consistency_pct: 100, // aucune cohérence en qualification
  min_trading_days: 0, // aucun jour minimum
  funded_consistency_pct: 40, // appliquée à CHAQUE demande de payout en Master
  profit_split: 100, // 100 % sur les 10 000 premiers cumulés, puis 90/10
  payout_model: 'progressive',
  payout_min_amount: 1_000, // l'un des plus élevés du marché
  payout_frequency_days: 7, // payouts le mercredi
  payout_min_days: 10, // 10 jours de trading avant le premier retrait
  platforms: ['rithmic', 'ninjatrader', 'quantower', 'tigertrade', 'atas'],
  /* Drawdowns, objectifs, contrats et abonnement vérifiés à la source le
     2026-07-24. Restent les frais d'ACTIVATION au passage (143 à 898 $), qui
     ne figurent pas sur la page publique — champ commercial, il ne bloque pas
     la vérification des règles. */
  confidence: 'verified',
  unverifiedFields: ['activation_fee'],
  note: 'Règles et abonnement vérifiés sur bulenox.com le 2026-07-24. Frais d’activation au passage non publiés (valeurs du concurrent conservées).',
};

/**
 * Vérifié sur bulenox.com le 2026-07-24 : drawdowns, objectifs, contrats max et
 * abonnement mensuel. Le site confirme aussi « First $10,000 100% » (le premier
 * palier de split) et la structure « Opt 1 : No Scaling / Opt 2 : EOD ».
 *
 * `price` = abonnement de BASE. Deux tailles seulement portent un coupon
 * ($50OFF sur le 50k, $60OFF sur le 100k) : les remises vivent dans promo_codes.
 * Les frais d'activation au passage ne figurent PAS sur la page publique.
 */
const SIZES = [
  { account_size: 25_000, drawdown_amount: 1_500, profit_target: 1_500, activation_fee: 143, price: 145, max_minis: 3 },
  { account_size: 50_000, drawdown_amount: 2_500, profit_target: 3_000, activation_fee: 148, price: 175, max_minis: 7 },
  { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, activation_fee: 248, price: 215, max_minis: 12 },
  { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, activation_fee: 498, price: 325, max_minis: 15 },
  { account_size: 250_000, drawdown_amount: 5_500, profit_target: 15_000, activation_fee: 898, price: 535, max_minis: 25 },
];

const offers = (withDll: boolean): OfferInput[] =>
  SIZES.map((s) => ({
    ...s,
    // DLL confirmé sur le 50k d'Option 2 uniquement.
    daily_loss_limit: withDll && s.account_size === 50_000 ? 1_100 : null,
    funded_daily_loss: withDll && s.account_size === 50_000 ? 1_100 : null,
    confidence: 'verified' as const,
  }));

export const bulenox: FirmSeed = {
  slug: 'bulenox',
  name: 'Bulenox',
  collectedAt: '2026-07-21',
  founded_year: 2022, // vérifié 2026-07-29 : Bulenox LLC (Wilmington, DE) — fondée en 2022
  country: 'US',
  hq_city: 'Wilmington',
  max_funded_accounts: 11,
  daily_flat_time: '15:59 America/Chicago',

  platforms: [
    { slug: 'rithmic', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'quantower', is_free: true },
    { slug: 'tigertrade', is_free: true },
    { slug: 'atas', is_free: true },
  ],

  styleRules: [
    { rule_key: 'bots', stance: 'allowed', detail: 'Bots, EA et copieurs explicitement autorisés — rare dans le secteur.' },
  ],

  plans: [
    {
      slug: 'option-1',
      name: 'Bulenox Option 1 (trailing)',
      account_kind: 'evaluation',
      offerDefaults: { ...BASE, drawdown_type: 'TRAIL', funded_drawdown_type: 'TRAIL' },
      offers: offers(false),
    },
    {
      slug: 'option-2',
      name: 'Bulenox Option 2 (EOD)',
      account_kind: 'evaluation',
      description: 'EOD avec DLL et scaling.',
      offerDefaults: { ...BASE, drawdown_type: 'EOD', funded_drawdown_type: 'EOD' },
      offers: offers(true),
    },
  ],

  engineCaveats: [
    'Split par palier : 100 % sur les 10 000 premiers dollars cumulés puis 90/10 (§12 #3). `profit_split` porte la valeur de DÉPART (100) ; la bascule n’est pas consommée par le moteur.',
    'Structure en trois étapes (Qualification → Master → Funded) : `rulesForPhase` ne connaît que evaluation/funded, l’étape Master est approximée par le financé (§12 #7).',
    'Reset à 78 $ : `reset_fee` n’existe pas au schéma (§12 #9).',
    'Le DLL disparaît une fois le drawdown verrouillé : conditionnel, non modélisé.',
  ],
  riskFlags: [
    'La règle de cohérence 40 % est décrite comme « la plainte canonique » de Bulenox (Trustpilot et X, 2025-2026) et la raison la plus fréquente de refus du PREMIER payout. À intégrer au health score.',
    '[PROMO] Remise PARTIELLE : coupons « $50OFF » (50k) et « $60OFF » (100k) uniquement, les trois autres tailles au tarif plein (relevé 2026-07-24). AUCUNE date de fin. Prix catalogue = tarif de base.',
  ],
};
