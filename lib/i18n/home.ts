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
  // Titre orienté SEO : les mots-clés qui font ranker.
  heroTitle: 'Comparateur de prop firms futures — prix TTC réels, règles vérifiées',
  // Sous-titre : la boucle complète, ce que nous sommes seuls à faire.
  heroSubtitle:
    'Compare les offres sur leur prix TTC réel et leurs règles vérifiées, journalise tes comptes, et découvre si tu aurais validé ton challenge ailleurs. Gratuit.',
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
  previewCta: 'Voir les {n} offres',
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
  faqTitle: 'Questions fréquentes',
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

  /* ---- Footer ---- */
  footerTagline: 'Ne choisis pas ta prop firm. Teste-la d’abord.',
  footerNavTitle: 'Explorer',
  footerCompare: 'Comparateur',
  footerJournal: 'Journal gratuit',
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
  heroTitle: 'Futures prop firm comparison — real total prices, verified rules',
  heroSubtitle:
    'Compare offers on real total price and verified rules, journal your accounts, and find out whether you’d have passed your challenge elsewhere. Free.',
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
  previewCta: 'See all {n} offers',
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

  faqTitle: 'Frequently asked questions',
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

  footerTagline: 'Don’t pick your prop firm. Test it first.',
  footerNavTitle: 'Explore',
  footerCompare: 'Comparator',
  footerJournal: 'Free journal',
  footerLangTitle: 'Language',
  footerDataAsOf: 'Comparator data generated on',
  footerRights: 'Futures prop firm comparison and trading journal.',

  soon: 'Section coming next',
};

export const HOME_DICTS: Record<Locale, Dict> = { fr, en };
export type HomeDict = Dict;
