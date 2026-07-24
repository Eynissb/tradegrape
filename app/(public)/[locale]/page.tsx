import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { buildHomeStats } from '@/lib/catalog/home-stats';
import { HOME_DICTS } from '@/lib/i18n/home';
import { comparatorHref, isLocale, type Locale } from '@/lib/i18n/comparator';
import { buttonClasses } from '@/components/ui/Button';
import JournalCta from '@/app/(public)/_home/JournalCta';

/**
 * Page d'accueil publique, une par langue (`/fr`, `/en`). Porte d'entrée SEO :
 * pré-générée (SSG) et régénérée à l'heure (ISR) — mais tous les CHIFFRES
 * viennent du catalogue publié, jamais codés en dur, pour ne pas périmer comme
 * la home des concurrents.
 */

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tradegrape.com';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = HOME_DICTS[locale];
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: { fr: `${SITE}/fr`, en: `${SITE}/en` },
    },
    openGraph: {
      title: d.metaTitle,
      description: d.metaDescription,
      url: `${SITE}/${locale}`,
      locale,
      type: 'website' as const,
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const d = HOME_DICTS[l];

  const { offers } = await loadPublicCatalog();
  const stats = buildHomeStats(offers);

  const nf = (n: number) => n.toLocaleString(l === 'fr' ? 'fr-FR' : 'en-US');
  const money = (v: number, c: string) => `${nf(v)} ${c}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tradegrape',
    url: `${SITE}/${l}`,
    description: d.metaDescription,
    inLanguage: l,
  };

  /* Sections encore à remplir : rendues en squelette pour valider le flux avant
     de brancher les données réelles. */
  const sections = [
    { id: 'firms', title: d.firmsTitle },
    { id: 'apercu', title: d.previewTitle },
    { id: 'journal', title: d.journalTitle },
    { id: 'honnetete', title: d.honestyTitle },
    { id: 'faq', title: d.faqTitle },
  ];

  return (
    <main className="pub-main home">
      <script
        type="application/ld+json"
        // Construit côté serveur, aucune entrée utilisateur.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------------------------------------------------- HERO */}
      <section className="home-hero">
        <span className="home-kicker">{d.heroKicker}</span>
        <h1 className="home-title">{d.heroTitle}</h1>
        <p className="home-sub">{d.heroSubtitle}</p>

        <div className="home-cta">
          <Link href={comparatorHref(l)} className={buttonClasses({ size: 'lg' })}>
            {d.ctaCompare}
          </Link>
          {/* Déconnecté : inscription GRATUITE (/signup), jamais un mur de login.
              Connecté : accès direct au journal (/app). Bascule côté client pour
              garder la page statique. */}
          <JournalCta signedOutLabel={d.ctaJournal} signedInLabel={d.ctaJournalSignedIn} />
        </div>

        {/* Trois chiffres réels tirés de la base publiée. */}
        <dl className="home-stats">
          <div className="home-stat">
            <dd className="home-stat-num num">{nf(stats.firmCount)}</dd>
            <dt className="home-stat-label">{d.statFirms}</dt>
          </div>
          <div className="home-stat">
            <dd className="home-stat-num num">{nf(stats.offerCount)}</dd>
            <dt className="home-stat-label">{d.statOffers}</dt>
          </div>
          <div className="home-stat">
            <dd className="home-stat-num num">
              {stats.cheapest ? money(stats.cheapest.totalPrice, stats.cheapest.currency) : '—'}
            </dd>
            <dt className="home-stat-label">
              {d.statCheapest}
              {stats.cheapest ? (
                <span className="home-stat-note"> · {stats.cheapest.firmName}</span>
              ) : (
                <span className="home-stat-note"> · {d.statCheapestEmpty}</span>
              )}
            </dt>
          </div>
        </dl>
      </section>

      {/* -------------------------------------------------- SQUELETTE */}
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="home-section home-skel">
          <h2 className="home-h2">{s.title}</h2>
          <p className="home-skel-note">{d.soon}</p>
        </section>
      ))}
    </main>
  );
}
