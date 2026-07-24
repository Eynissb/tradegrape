import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * My Funded Futures — collecte du 2026-07-21.
 *
 * ⚠️ CONVERSION DE BUFFER. La collecte donne les buffers Flex en ÉCART au-dessus
 * du capital (1 100 / 2 100 / 3 100 / 4 600), alors que `PayoutRules.buffer` est
 * un SOLDE ABSOLU (`evaluatePayout` fait `currentBalance - buffer`). Saisir 1 100
 * sur un compte de 25 000 aurait rendu ~23 900 $ « retirables ». On convertit
 * donc en absolu : capital + écart — ce qui retombe exactement sur les valeurs
 * d'Apex et de Lucid (26 100, 52 100, 103 100).
 *
 * ⚠️ La cohérence par plan est le point le plus CONTRADICTOIRE de la collecte :
 * une source dit que seul « Core » a 50 %, le concurrent l'attribue à Flex,
 * Rapid et Pro. Tout est marqué à revérifier.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: true, // abonnement mensuel jusqu'au passage
  activation_fee: 0,
  drawdown_locks_at_breakeven: true, // verrouillé à capital + 100
  daily_loss_limit: null, // aucun DLL — différenciateur revendiqué
  funded_daily_loss: null,
  payout_model: 'buffer_then_free',
  payout_min_amount: 500,
  payout_method: 'Riseworks',
  platforms: ['tradovate', 'ninjatrader', 'dxfeed'],
  price: null,
};

/** Écart de buffer → solde absolu attendu par le moteur. */
const abs = (size: number, delta: number) => size + delta;

export const myFundedFutures: FirmSeed = {
  slug: 'my-funded-futures',
  name: 'My Funded Futures',
  collectedAt: '2026-07-21',

  platforms: [
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'dxfeed', is_free: true },
  ],

  plans: [
    {
      slug: 'flex',
      name: 'MFF Flex',
      account_kind: 'evaluation',
      description: 'Le compte financé démarre à zéro et peut passer en négatif jusqu’à ce que le MLL remonte.',
      offerDefaults: {
        ...BASE,
        drawdown_type: 'EOD', funded_drawdown_type: 'EOD',
        consistency_pct: 50,
        funded_consistency_pct: 100,
        min_trading_days: 2,
        profit_split: 80,
        payout_min_days: 5,
        confidence: 'unverified',
        unverifiedFields: ['consistency_pct', 'price'],
        note: 'Cohérence contradictoire entre sources (peut n’exister que sur « Core »).',
      },
      offers: [
        {
          account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500,
          payout_buffer: abs(25_000, 1_100), confidence: 'unverified',
          payoutCaps: [{ cycle_from: 1, cycle_to: null, max_amount: 3_000, note: 'Plafond Flex 25k' }],
        },
        {
          account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000,
          payout_buffer: abs(50_000, 2_100), funded_max_minis: 5, funded_max_micros: 50, confidence: 'unverified',
          payoutCaps: [{ cycle_from: 1, cycle_to: null, max_amount: 5_000, note: 'Plafond Flex 50k' }],
        },
        {
          account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000,
          payout_buffer: abs(100_000, 3_100), funded_max_minis: 10, funded_max_micros: 100, confidence: 'unverified',
        },
        {
          account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000,
          payout_buffer: abs(150_000, 4_600), funded_max_minis: 15, funded_max_micros: 150, confidence: 'unverified',
        },
      ],
    },
    {
      slug: 'rapid',
      name: 'MFF Rapid',
      account_kind: 'evaluation',
      description: '⚠️ Drawdown DURCI au passage en financé : EOD Trailing en évaluation, INTRADAY une fois financé. Split 90 %, retraits quotidiens, aucune cohérence.',
      offerDefaults: {
        ...BASE,
        /* CORRECTION 2026-07-24 : la page officielle affiche « Drawdown Mode :
           EOD Trailing » en évaluation et « Intraday » en financé. Le fichier
           indiquait TRAIL dans les deux phases — l'évaluation était donc
           décrite plus strictement que la réalité, et le durcissement invisible.
           Même famille que TPT et TradeDay QuickPay. */
        drawdown_type: 'EOD', funded_drawdown_type: 'TRAIL',
        consistency_pct: 100,
        funded_consistency_pct: 100,
        min_trading_days: 2,
        profit_split: 90,
        payout_frequency_days: 1,
        confidence: 'unverified',
        unverifiedFields: ['consistency_pct', 'price'],
        note: 'Cohérence contradictoire entre sources.',
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, confidence: 'unverified' },
      ],
    },
    {
      slug: 'builder',
      name: 'MFF Builder',
      account_kind: 'evaluation',
      description: '50k uniquement. Pause souple à 1 000 $ (et non un DLL dur). Plafond 2 000 $ par cycle, 5 payouts simulés max.',
      offerDefaults: {
        ...BASE,
        drawdown_type: 'EOD', funded_drawdown_type: 'EOD',
        consistency_pct: 100,
        funded_consistency_pct: 50,
        min_trading_days: 1,
        profit_split: 80,
        payout_model: 'fixed_cap',
        payout_frequency_days: 2,
        confidence: 'unverified',
        unverifiedFields: ['price'],
      },
      offers: [
        {
          account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000,
          daily_loss_limit: 1_000, funded_daily_loss: 1_000, confidence: 'unverified',
          payoutCaps: [{ cycle_from: 1, cycle_to: 5, max_amount: 2_000, note: 'Plafond par cycle, 5 payouts simulés maximum' }],
          note: 'La « pause souple » à 1 000 $ est saisie comme DLL : le moteur la traitera comme une limite dure, ce qu’elle n’est pas.',
        },
      ],
    },
  ],

  engineCaveats: [
    'Buffers Flex convertis d’un ÉCART (1 100…) en SOLDE ABSOLU (26 100…), sans quoi `evaluatePayout` aurait rendu presque tout le capital « retirable ».',
    'La « pause souple » à 1 000 $ de Builder n’est pas une limite d’échec : le moteur la traite comme un DLL dur, donc plus strictement que la réalité.',
    'Pro est plafonné à 100 000 $ au total (plafond cumulatif, pas par cycle) : non modélisable — plan non saisi faute de paramètres.',
    'Un profit net de 10 000 $ en une journée déclenche un passage automatique en compte live sur Rapid : non modélisé.',
  ],
  riskFlags: [
    'Existence et paramètres du plan « Core » non établis ; la cohérence par plan est le point le plus contradictoire de toute la collecte.',
    '⚠️ LE PLAN « FLEX » N’EXISTE PLUS au sélecteur public (relevé 2026-07-24) : le site ne propose que Builder, Rapid et Pro. Les 4 offres Flex du catalogue ne sont probablement plus vendues — à retirer ou archiver après confirmation.',
    'Promotion « 50% OFF » avec le code 300K, mention « Based on current promotions », sans date de fin (2026-07-24).',
    'Prix par taille NON relevés : le sélecteur de taille ne re-rend pas les cartes de façon fiable. Les tarifs vus (Builder ~105, Rapid ~109, Pro ~344 en base) n’ont pas pu être attribués à une taille avec certitude — non saisis plutôt que devinés.',
  ],
};
