/**
 * Dictionnaire de la page d'accueil, FR + EN. Même discipline que le comparateur
 * (`comparator.ts`) : `Dict` impose qu'une clé ajoutée en français existe aussi
 * en anglais, sinon le build casse.
 *
 * Les réponses de FAQ portant des données ({firm}, {price}, {list}…) sont des
 * gabarits : la valeur réelle est injectée à l'affichage depuis la base, jamais
 * codée ici.
 */

import type { Locale } from './comparator';

const fr = {
  metaTitle: 'Tradegrape — comparateur de prop firms futures et journal gratuit',
  metaDescription:
    'Compare les prop firms futures sur leur prix TTC réel et leurs règles vérifiées, puis journalise tes comptes gratuitement. Sache si ton challenge va passer — avant de payer.',

  heroKicker: 'Comparateur · Journal · Futures',
  heroLive: 'Données vérifiées à la source, prix TTC réels',
  // Titre orienté SEO : les mots-clés qui font ranker.
  heroTitle: 'Comparateur de prop firms futures — prix TTC réels, règles vérifiées',
  // Sous-titre : la boucle complète, ce que nous sommes seuls à faire.
  heroSubtitle:
    'Compare les offres sur leur prix TTC réel et leurs règles vérifiées, journalise tes comptes, et découvre si tu aurais validé ton challenge ailleurs. Gratuit.',
  previewLive: 'Données à jour',
  previewColNote: 'Note',
  previewColPromo: 'Promo',
  bestPrice: 'Meilleur prix',
  heroVizAccount: 'Compte 50k · évaluation',
  heroVizPayout: 'Ce qu’il te manque pour retirer',
  heroVizPayoutVal: '2 jours de profit · 340 $',
  heroVizFloor: 'plancher drawdown',
  offersTitle: 'Les offres du moment',
  offersSub: 'Prix d’entrée réel par firm — et code promo dès qu’on en négocie un.',
  offersNew: 'Récent',
  rankTitle: 'Le classement des prop firms',
  rankSub: 'Classées sur la fiabilité et la couverture, pas sur la commission. Tout est vérifié à la source.',
  colRank: '#',
  colCountry: 'Pays',
  colSince: 'Depuis',
  colPlatforms: 'Plateformes',
  colAlloc: 'Alloc. max',
  rankSee: 'Voir',
  rankNoRating: 'à noter',
  rankOffers: '{n} offres',

  /* ---- Terminal (home refonte data-first) ---- */
  termTitleLead: 'Ne choisis pas ta prop firm.',
  termTitleEm: 'Teste-la d’abord.',
  heroLede:
    'Le seul comparateur qui exécute les règles au lieu de les décrire : drawdown, cohérence et payout calculés sur tes trades.',
  heroEquityLabel: 'ton équité',
  heroTrapCaption: 'Le plancher trailing monte vers ton équité, même sur un trade gagnant.',
  heroProof: 'La preuve, pas la promesse',
  heroBadge: 'Le journal de trading est 100 % gratuit',
  heroFeat1: 'Prix TTC réels',
  heroFeat2: 'Règles vérifiées & datées',
  heroFeat3: 'Journal gratuit',
  heroTopTitle: 'Top 10 des prop firms du mois',
  heroTopNote: 'classé sur la fiabilité, vérifié à la source',
  heroTopVerified: 'Données vérifiées',
  heroTopPrev: 'Précédent',
  heroTopNext: 'Suivant',
  ctaJournalDiscover: 'Découvrir le journal',
  termConsistencyNone: 'aucune',
  termHardenedShort: 'durci',
  termRowAction: 'voir dans le comparateur',
  termTitle: 'Le terminal des offres',
  termSub:
    'Chaque compte avec ses vraies règles, vérifiées à la source. Trié sur la fiabilité — jamais sur la commission.',
  termCount: '{n} comptes en base',
  termColFunded: 'Passage financé',
  termColConsistency: 'Cohérence',
  termColSplit: 'Split',
  termColContracts: 'Contrats min | µ',
  termColTarget: 'Objectif',
  termColDaily: 'Daily loss',
  termColPtdd: 'PT:DD',
  termColMinDays: 'Jours min',
  termHardeningUnchanged: 'inchangé',
  termLegendTrail: 'Trailing : le plancher monte intraday, même sur un trade gagnant — le piège n°1.',
  termLegendHardening: 'Passage financé : la règle se durcit une fois le compte financé (souvent EOD → trailing).',
  termLegendVerified: 'Chaque ligne est datée : vérifiée à la source, ou marquée « à vérifier ».',
  termScrollHint: 'Défile horizontalement pour toutes les colonnes',
  termFloor: 'dès',
  pricePeriodOnce: 'paiement unique',
  pricePeriodMonthly: 'par mois',
  termRowCta: 'Comparer',
  tabFirms: 'Firms',
  tabChallenges: 'Challenges',
  tabPromos: 'Codes promo',
  colOffers: 'Offres',
  colDiscount: 'Remise',
  colPromoEnds: 'Échéance',
  promoPermanent: 'permanente',
  promoEmpty: 'Aucun code promo négocié pour l’instant. On les ajoute dès qu’un partenariat est signé.',
  promoOff: '% OFF',
  copyCode: 'Copier le code',
  promoExclusive: 'Exclusif',
  promoGeneric: 'Code promo',
  promoApply: 'Voir la firm',
  promoCodeLabel: 'Code',
  firmsViewSub: 'Vue par prop firm : note, ancienneté, plateformes, allocation max.',
  challengesViewSub: 'Vue par compte : prix TTC réel, drawdown des deux phases, cohérence, split.',
  promosViewSub: 'Les codes promo négociés, avec la remise et l’échéance. Prix TTC réel affiché.',
  ctaCompare: 'Comparer les prop firms',
  ctaJournal: 'Ouvrir le journal gratuit',
  ctaJournalSignedIn: 'Ouvrir mon journal',

  statFirms: 'prop firms comparées',
  statOffers: 'comptes comparés',
  statCheapest: 'la moins chère',
  statCheapestEmpty: 'prix à publier',

  /* ---- 1. Aperçu comparateur ---- */
  previewTitle: 'Le comparateur, pas sa description',
  previewSub:
    'Prix TTC réel (prix d’achat + activation), drawdown des deux phases, cohérence, date de vérification. Un extrait :',
  previewCta: 'Voir tout',
  howTitle: 'Comment ça marche',
  howSub: 'Compare, journalise, rachète en connaissance de cause. La boucle qui fait la différence.',
  howStep1T: 'Compare',
  howStep1B: 'Prix TTC réel et vraies règles de 60+ offres, côte à côte. Classé sur la fiabilité, jamais sur la commission.',
  howStep2T: 'Journalise',
  howStep2B: 'Ajoute ton compte, ses règles se configurent seules. Le moteur te situe chaque jour face au drawdown et au payout.',
  howStep3T: 'Rachète',
  howStep3B: 'Rejoue ton historique contre les autres offres : aurais-tu validé ailleurs ? Tu rachètes au bon endroit, via nos liens.',
  creatorFollow: 'Suivre sur',

  // Capture email (home) — alertes de règles, codes promo, digest (§1/§7/§10).
  alertsEyebrow: 'Reste au courant',
  alertsTitle: 'Ne rate plus un changement de règle',
  alertsSub: 'Une firm durcit son drawdown, un code promo exclusif tombe, ton digest hebdo est prêt : tu es prévenu. Zéro spam, désinscription en un clic.',
  alertsPlaceholder: 'ton@email.com',
  alertsCta: 'M’inscrire',
  alertsCtaBusy: 'Envoi…',
  alertsConsent: 'Désinscription en un clic. On ne partage jamais ton email.',
  alertsSuccess: 'C’est fait — tu recevras les alertes. Pense à vérifier tes spams.',
  alertsErrorEmail: 'Cet email n’a pas l’air valide.',
  alertsError: 'Un souci est survenu. Réessaie dans un instant.',
  previewColFirm: 'Prop firm',
  previewColPlan: 'Compte',
  previewColSize: 'Taille',
  previewColPrice: 'Prix TTC',
  previewColDrawdown: 'Drawdown',
  previewColReviewed: 'Vérifié le',
  previewHardening: 'durcit en financé',
  previewNotVerified: 'à vérifier',
  previewEmpty: 'Aucune offre publiée pour l’instant.',

  /* ---- 2. Firms ---- */
  firmsTitle: 'Les firms que nous comparons',
  firmsSub: 'Prix d’entrée réel. Une promo est signalée comme promo, jamais fondue dans le prix.',
  firmsFrom: 'dès',
  firmsNoPrice: 'prix à publier',
  firmsOffers: 'offres',

  /* ---- 3. Journal ---- */
  journalTitle: 'Ce que les comparateurs n’ont pas : le journal',
  journalIntro:
    'Les comparateurs sont en lecture seule : on les consulte une fois, on part. Le nôtre garde ton historique et te dit, chiffres à l’appui, si ton compte va passer. Gratuit, sans carte.',
  journalStep1Title: 'Compare',
  journalStep1Body:
    'Filtre les offres sur leur prix TTC réel et leurs règles. Ajoute celle qui t’intéresse à ton journal — ses règles sont configurées automatiquement.',
  journalStep2Title: 'Journalise',
  journalStep2Body:
    'Saisis ton P&L quotidien. Le moteur montre en direct ta position vs le daily loss, le plancher de drawdown, la cohérence et ta progression vers le payout.',
  journalStep3Title: 'Sache si tu aurais validé ailleurs',
  journalStep3Body:
    'Rejoue ton historique réel contre les règles des autres offres. Découvre chez qui tu aurais passé — et chez qui le trailing intraday t’aurait éliminé.',
  journalDashCaption: 'Aperçu du journal — exemple',
  journalDashAccount: 'Compte 50 000 · évaluation',
  journalDashDailyLabel: 'Daily loss restant',
  journalDashFloorLabel: 'Plancher de drawdown',
  journalDashTargetLabel: 'Objectif',
  journalDashPayoutTitle: 'Ce qu’il te manque pour retirer',
  journalDashPayoutMissing: '2 jours de profit et 340 $',
  journalDashExample: 'Chiffres d’exemple',

  /* ---- 4. Honnêteté ---- */
  honestyTitle: 'Ce qui nous distingue',
  honesty1Title: 'Prix TTC réel',
  honesty1Body:
    'Le prix affiché inclut l’activation et, en UE, la TVA. Pas de tarif d’appel qui double au paiement. Un abonnement mensuel est montré comme tel, jamais comme un prix unique.',
  honesty2Title: 'Règles datées et vérifiées',
  honesty2Body:
    'Chaque règle est relevée à la source et porte sa date de vérification. Ce que nous n’avons pas encore confirmé est marqué « à vérifier », jamais présenté comme sûr.',
  honesty3Title: 'Alerte quand une firm change ses règles',
  honesty3Body:
    'Ton compte fige les règles au moment où tu l’ajoutes. Si la firm les modifie, tu es prévenu — les prop firms changent souvent, et une règle durcie peut te faire échouer sans que tu le saches.',

  /* ---- 5. FAQ ---- (réponses avec données injectées depuis la base) */
  faqTitle: 'FAQ',
  faqCheapestQ: 'Quelle est la prop firm futures la moins chère ?',
  faqCheapestA:
    'Aujourd’hui la moins chère est {firm}, à {price} en prix TTC (prix d’achat plus activation). Le classement bouge : compare-les toujours sur le prix réel, pas sur le tarif d’appel.',
  faqCheapestAEmpty:
    'Aucun prix n’est encore publié dans le comparateur. Il s’affiche dès qu’une offre est vérifiée à la source.',
  faqDrawdownQ: 'Drawdown EOD ou trailing : quelle différence ?',
  faqDrawdownA:
    'Le drawdown EOD se fige sur le plus haut de clôture journalière ; le trailing suit le plus haut de ta courbe, intraday compris — c’est le piège n°1, il monte même pendant un trade gagnant. Sur nos offres publiées, {trail} sont en trailing dès l’évaluation, et {hardening} passent en trailing une fois financées. Le comparateur affiche les deux phases.',
  faqConsistencyQ: 'Quelles firms n’imposent pas de règle de cohérence ?',
  faqConsistencyA:
    'La cohérence limite le poids de ton meilleur jour dans le profit total — c’est ce qui fait le plus échouer les payouts. Proposent au moins une offre sans cette règle : {firms}. Le filtre « Sans cohérence » du comparateur les isole.',
  faqConsistencyAEmpty:
    'Parmi les offres publiées, aucune n’est aujourd’hui sans règle de cohérence. Le filtre « Sans cohérence » du comparateur se met à jour avec le catalogue.',
  faqFeesQ: 'Y a-t-il des frais cachés ?',
  faqFeesA:
    'Pas chez nous : le prix affiché est le prix TTC, activation comprise. Facturent une activation en plus du prix d’achat : {firms}. Cette activation est déjà incluse dans le prix TTC du comparateur, pour que tu compares le coût réel.',
  faqFeesAEmpty:
    'Le prix affiché est le prix TTC, activation comprise. Aucune firm publiée ne facture aujourd’hui de frais d’activation séparés.',
  faqCompareCta: 'Ouvrir le comparateur',
  faqHelpCta: 'Centre d’aide',

  /* ---- Footer ---- */
  footerTagline: 'Ne choisis pas ta prop firm. Teste-la d’abord.',
  footerNavTitle: 'Explorer',
  footerCompare: 'Comparateur',
  footerJournal: 'Journal gratuit',
  footerAccountTitle: 'Compte',
  footerSignin: 'Connexion',
  footerStart: 'Commencer',
  footerLangTitle: 'Langue',
  footerDataAsOf: 'Données du comparateur générées le',
  footerRights: 'Comparateur de prop firms futures et journal de trading.',

  soon: 'Section à venir',
} as const;

type Dict = { readonly [K in keyof typeof fr]: string };

const en: Dict = {
  metaTitle: 'Tradegrape — futures prop firm comparison and free trading journal',
  metaDescription:
    'Compare futures prop firms on real total price and verified rules, then journal your accounts for free. Know whether your challenge will pass — before you pay.',

  heroKicker: 'Comparison · Journal · Futures',
  heroLive: 'Source-verified data, real total prices',
  heroTitle: 'Futures prop firm comparison — real total prices, verified rules',
  heroSubtitle:
    'Compare offers on real total price and verified rules, journal your accounts, and find out whether you’d have passed your challenge elsewhere. Free.',
  previewLive: 'Data up to date',
  previewColNote: 'Rating',
  previewColPromo: 'Promo',
  bestPrice: 'Best price',
  heroVizAccount: '50k account · evaluation',
  heroVizPayout: 'What you still need to withdraw',
  heroVizPayoutVal: '2 profit days · $340',
  heroVizFloor: 'drawdown floor',
  offersTitle: 'Current offers',
  offersSub: 'Real entry price per firm — and a promo code as soon as we negotiate one.',
  offersNew: 'Recent',
  rankTitle: 'The prop firm ranking',
  rankSub: 'Ranked on reliability and coverage, never on commission. Everything verified at the source.',
  colRank: '#',
  colCountry: 'Country',
  colSince: 'Since',
  colPlatforms: 'Platforms',
  colAlloc: 'Max alloc.',
  rankSee: 'View',
  rankNoRating: 'unrated',
  rankOffers: '{n} offers',

  /* ---- Terminal (data-first home redesign) ---- */
  termTitleLead: 'Don’t pick your prop firm.',
  termTitleEm: 'Test it first.',
  heroLede:
    'The only comparator that runs the rules instead of describing them: drawdown, consistency and payout computed on your trades.',
  heroEquityLabel: 'your equity',
  heroTrapCaption: 'The trailing floor climbs toward your equity, even on a winning trade.',
  heroProof: 'The proof, not the promise',
  heroBadge: 'The trading journal is 100% free',
  heroFeat1: 'Real total prices',
  heroFeat2: 'Rules verified & dated',
  heroFeat3: 'Free journal',
  heroTopTitle: 'Top 10 prop firms of the month',
  heroTopNote: 'ranked on reliability, verified at source',
  heroTopVerified: 'Verified data',
  heroTopPrev: 'Previous',
  heroTopNext: 'Next',
  ctaJournalDiscover: 'Explore the journal',
  termConsistencyNone: 'none',
  termHardenedShort: 'hardened',
  termRowAction: 'view in the comparator',
  termTitle: 'The offer terminal',
  termSub:
    'Every account with its real rules, verified at source. Sorted on reliability — never on commission.',
  termCount: '{n} accounts on file',
  termColFunded: 'When funded',
  termColConsistency: 'Consistency',
  termColSplit: 'Split',
  termColContracts: 'Contracts min | µ',
  termColTarget: 'Profit target',
  termColDaily: 'Daily loss',
  termColPtdd: 'PT:DD',
  termColMinDays: 'Min days',
  termHardeningUnchanged: 'unchanged',
  termLegendTrail: 'Trailing: the floor rises intraday, even on a winning trade — the number-one trap.',
  termLegendHardening: 'When funded: the rule hardens once the account is funded (often EOD → trailing).',
  termLegendVerified: 'Every row is dated: verified at source, or flagged “unverified”.',
  termScrollHint: 'Scroll horizontally for all columns',
  termFloor: 'from',
  pricePeriodOnce: 'one-time',
  pricePeriodMonthly: 'monthly',
  termRowCta: 'Compare',
  tabFirms: 'Firms',
  tabChallenges: 'Challenges',
  tabPromos: 'Promo codes',
  colOffers: 'Offers',
  colDiscount: 'Discount',
  colPromoEnds: 'Ends',
  promoPermanent: 'permanent',
  promoEmpty: 'No promo code negotiated yet. We add them as soon as a partnership is signed.',
  promoOff: '% OFF',
  copyCode: 'Copy code',
  promoExclusive: 'Exclusive',
  promoGeneric: 'Promo code',
  promoApply: 'View firm',
  promoCodeLabel: 'Code',
  firmsViewSub: 'By prop firm: rating, seniority, platforms, max allocation.',
  challengesViewSub: 'By account: real total price, drawdown in both phases, consistency, split.',
  promosViewSub: 'Negotiated promo codes, with the discount and expiry. Real total price shown.',
  ctaCompare: 'Compare prop firms',
  ctaJournal: 'Open the free journal',
  ctaJournalSignedIn: 'Open my journal',

  statFirms: 'prop firms compared',
  statOffers: 'accounts compared',
  statCheapest: 'cheapest offer',
  statCheapestEmpty: 'price to publish',

  previewTitle: 'The comparator, not a description of it',
  previewSub:
    'Real total price (purchase + activation), drawdown in both phases, consistency, verification date. A sample:',
  previewCta: 'See all',
  howTitle: 'How it works',
  howSub: 'Compare, journal, buy back with your eyes open. The loop that makes the difference.',
  howStep1T: 'Compare',
  howStep1B: 'Real all-in price and the actual rules of 60+ offers, side by side. Ranked on reliability, never on commission.',
  howStep2T: 'Journal',
  howStep2B: 'Add your account, its rules configure themselves. The engine places you against drawdown and payout every day.',
  howStep3T: 'Rebuy',
  howStep3B: 'Replay your history against other offers: would you have passed elsewhere? You buy back in the right place, via our links.',
  creatorFollow: 'Follow on',

  // Email capture (home) — rule alerts, promo codes, digest.
  alertsEyebrow: 'Stay in the loop',
  alertsTitle: 'Never miss a rule change',
  alertsSub: 'A firm tightens its drawdown, an exclusive promo code drops, your weekly digest is ready: you get told. Zero spam, one-click unsubscribe.',
  alertsPlaceholder: 'you@email.com',
  alertsCta: 'Subscribe',
  alertsCtaBusy: 'Sending…',
  alertsConsent: 'One-click unsubscribe. We never share your email.',
  alertsSuccess: 'Done — you’ll get the alerts. Check your spam folder just in case.',
  alertsErrorEmail: 'That email doesn’t look valid.',
  alertsError: 'Something went wrong. Try again in a moment.',
  previewColFirm: 'Prop firm',
  previewColPlan: 'Account',
  previewColSize: 'Size',
  previewColPrice: 'Total price',
  previewColDrawdown: 'Drawdown',
  previewColReviewed: 'Verified on',
  previewHardening: 'hardens when funded',
  previewNotVerified: 'unverified',
  previewEmpty: 'No offer published yet.',

  firmsTitle: 'The firms we compare',
  firmsSub: 'Real entry price. A promo is shown as a promo, never folded into the price.',
  firmsFrom: 'from',
  firmsNoPrice: 'price to publish',
  firmsOffers: 'offers',

  journalTitle: 'What comparators don’t have: the journal',
  journalIntro:
    'Comparators are read-only: you check once and leave. Ours keeps your history and tells you, with real numbers, whether your account will pass. Free, no card.',
  journalStep1Title: 'Compare',
  journalStep1Body:
    'Filter offers on real total price and rules. Add the one you want to your journal — its rules are configured automatically.',
  journalStep2Title: 'Journal',
  journalStep2Body:
    'Log your daily P&L. The engine shows, live, where you stand vs the daily loss, the drawdown floor, consistency and your progress toward payout.',
  journalStep3Title: 'Know if you’d have passed elsewhere',
  journalStep3Body:
    'Replay your real history against other offers’ rules. See where you’d have passed — and where intraday trailing would have knocked you out.',
  journalDashCaption: 'Journal preview — example',
  journalDashAccount: '50,000 account · evaluation',
  journalDashDailyLabel: 'Daily loss left',
  journalDashFloorLabel: 'Drawdown floor',
  journalDashTargetLabel: 'Target',
  journalDashPayoutTitle: 'What you still need to withdraw',
  journalDashPayoutMissing: '2 profit days and $340',
  journalDashExample: 'Example figures',

  honestyTitle: 'What sets us apart',
  honesty1Title: 'Real total price',
  honesty1Body:
    'The listed price includes activation and, in the EU, VAT. No teaser price that doubles at checkout. A monthly subscription is shown as one, never as a one-time price.',
  honesty2Title: 'Rules dated and verified',
  honesty2Body:
    'Every rule is checked at source and carries its verification date. What we haven’t confirmed yet is marked “unverified,” never presented as certain.',
  honesty3Title: 'Alert when a firm changes its rules',
  honesty3Body:
    'Your account freezes the rules the moment you add it. If the firm changes them, you’re notified — prop firms change often, and a hardened rule can fail you without warning.',

  faqTitle: 'FAQ',
  faqCheapestQ: 'Which futures prop firm is the cheapest?',
  faqCheapestA:
    'Right now the cheapest is {firm}, at {price} total price (purchase plus activation). The ranking shifts: always compare on the real price, not the teaser rate.',
  faqCheapestAEmpty:
    'No price is published in the comparator yet. It appears as soon as an offer is verified at source.',
  faqDrawdownQ: 'EOD vs trailing drawdown: what’s the difference?',
  faqDrawdownA:
    'EOD drawdown locks to the highest daily close; trailing follows your equity peak, intraday included — the number-one trap, it rises even during a winning trade. Across our published offers, {trail} use trailing from evaluation, and {hardening} switch to trailing once funded. The comparator shows both phases.',
  faqConsistencyQ: 'Which firms have no consistency rule?',
  faqConsistencyA:
    'Consistency caps how much your best day can weigh in total profit — the leading cause of failed payouts. Offering at least one account without it: {firms}. The comparator’s “No consistency” filter isolates them.',
  faqConsistencyAEmpty:
    'Among published offers, none is currently without a consistency rule. The “No consistency” filter updates with the catalogue.',
  faqFeesQ: 'Are there hidden fees?',
  faqFeesA:
    'Not with us: the listed price is the total price, activation included. Charging an activation on top of the purchase price: {firms}. That activation is already included in the comparator’s total price, so you compare the real cost.',
  faqFeesAEmpty:
    'The listed price is the total price, activation included. No published firm currently charges a separate activation fee.',
  faqCompareCta: 'Open the comparator',
  faqHelpCta: 'Help Center',

  footerTagline: 'Don’t pick your prop firm. Test it first.',
  footerNavTitle: 'Explore',
  footerCompare: 'Comparator',
  footerJournal: 'Free journal',
  footerAccountTitle: 'Account',
  footerSignin: 'Sign in',
  footerStart: 'Get started',
  footerLangTitle: 'Language',
  footerDataAsOf: 'Comparator data generated on',
  footerRights: 'Futures prop firm comparison and trading journal.',

  soon: 'Section coming next',
};

export const HOME_DICTS: Record<Locale, Dict> = { fr, en };
export type HomeDict = Dict;
