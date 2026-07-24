/**
 * Dictionnaire de la page d'accueil, FR + EN. Même discipline que le comparateur
 * (`comparator.ts`) : `Dict` impose qu'une clé ajoutée en français existe aussi
 * en anglais, sinon le build casse.
 *
 * Réutilise `Locale`/`LOCALES` du comparateur — une seule source de vérité pour
 * les langues du site.
 */

import type { Locale } from './comparator';

const fr = {
  metaTitle: 'Tradegrape — comparateur de prop firms futures et journal gratuit',
  metaDescription:
    'Compare les prop firms futures sur leur prix TTC réel et leurs règles vérifiées, puis journalise tes comptes gratuitement. Sache si ton challenge va passer — avant de payer.',

  heroKicker: 'Comparateur · Journal · Futures',
  heroTitle: 'Ne choisis pas ta prop firm. Teste-la d’abord.',
  heroSubtitle:
    'Compare les offres sur leur prix TTC réel et leurs règles vérifiées, journalise tes comptes, et découvre si tu aurais validé ailleurs. Gratuit.',
  ctaCompare: 'Comparer les prop firms',
  ctaJournal: 'Ouvrir le journal gratuit',
  /* Session active : le CTA d'inscription devient un accès direct au journal. */
  ctaJournalSignedIn: 'Ouvrir mon journal',

  /* Libellés des trois chiffres du hero — les valeurs viennent de la base. */
  statFirms: 'prop firms comparées',
  statOffers: 'comptes comparés',
  statCheapest: 'la moins chère',
  statCheapestEmpty: 'prix à publier',

  /* Titres de sections (le corps est rempli section par section). */
  firmsTitle: 'Les firms que nous comparons',
  firmsSub: 'Prix d’entrée réel, promo signalée comme promo.',
  previewTitle: 'Le comparateur, pas sa description',
  previewCta: 'Voir les {n} offres',
  journalTitle: 'Ce que les comparateurs n’ont pas : le journal',
  honestyTitle: 'Ce qui nous distingue',
  faqTitle: 'Questions fréquentes',

  /* Marqueur temporaire des sections encore à remplir. */
  soon: 'Section à venir',
} as const;

type Dict = { readonly [K in keyof typeof fr]: string };

const en: Dict = {
  metaTitle: 'Tradegrape — futures prop firm comparison and free trading journal',
  metaDescription:
    'Compare futures prop firms on real total price and verified rules, then journal your accounts for free. Know whether your challenge will pass — before you pay.',

  heroKicker: 'Comparison · Journal · Futures',
  heroTitle: 'Don’t pick your prop firm. Test it first.',
  heroSubtitle:
    'Compare offers on real total price and verified rules, journal your accounts, and find out whether you’d have passed elsewhere. Free.',
  ctaCompare: 'Compare prop firms',
  ctaJournal: 'Open the free journal',
  ctaJournalSignedIn: 'Open my journal',

  statFirms: 'prop firms compared',
  statOffers: 'accounts compared',
  statCheapest: 'cheapest offer',
  statCheapestEmpty: 'price to publish',

  firmsTitle: 'The firms we compare',
  firmsSub: 'Real entry price, promos shown as promos.',
  previewTitle: 'The comparator, not a description of it',
  previewCta: 'See all {n} offers',
  journalTitle: 'What comparators don’t have: the journal',
  honestyTitle: 'What sets us apart',
  faqTitle: 'Frequently asked questions',

  soon: 'Section coming next',
};

export const HOME_DICTS: Record<Locale, Dict> = { fr, en };
export type HomeDict = Dict;
