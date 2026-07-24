import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { buildHomeStats } from '@/lib/catalog/home-stats';
import { sortOffers } from '@/lib/catalog/public-offer';
import { HOME_DICTS } from '@/lib/i18n/home';
import { comparatorHref, isLocale, type Locale } from '@/lib/i18n/comparator';
import { buttonClasses } from '@/components/ui/Button';
import JournalCta from '@/app/(public)/_home/JournalCta';
import SiteFooter from '@/app/(public)/_home/SiteFooter';

/**
 * Page d'accueil publique, une par langue (`/fr`, `/en`). Porte d'entrée SEO :
 * pré-générée (SSG) et régénérée à l'heure (ISR) — mais tous les CHIFFRES
 * viennent du catalogue publié, jamais codés en dur, pour ne pas périmer comme
 * la home des concurrents.
 *
 * Ordre : Hero → 1. Aperçu comparateur → 2. Firms → 3. Journal → 4. Honnêteté →
 * 5. FAQ. Le comparateur ouvre car c'est le canal SEO ; le journal, en 3, est
 * traité richement — c'est le différenciateur, il ne doit pas être noyé.
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

  const { offers, generatedAt } = await loadPublicCatalog();
  const stats = buildHomeStats(offers);
  const preview = sortOffers(offers, 'total_price').slice(0, 5);

  const nf = (n: number) => n.toLocaleString(l === 'fr' ? 'fr-FR' : 'en-US');
  const money = (v: number, c: string) => `${nf(v)} ${c}`;
  const fill = (tpl: string, map: Record<string, string>) =>
    Object.entries(map).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  /** « A, B et C » / « A, B and C ». */
  const listFmt = (xs: string[]) => {
    if (xs.length <= 1) return xs.join('');
    const conj = l === 'fr' ? ' et ' : ' and ';
    return xs.slice(0, -1).join(', ') + conj + xs[xs.length - 1];
  };

  /* ---- FAQ : questions figées, réponses tirées de la base ---- */
  const faq = [
    {
      q: d.faqCheapestQ,
      a: stats.cheapest
        ? fill(d.faqCheapestA, {
            firm: stats.cheapest.firmName,
            price: money(stats.cheapest.totalPrice, stats.cheapest.currency),
          })
        : d.faqCheapestAEmpty,
    },
    {
      q: d.faqDrawdownQ,
      a: fill(d.faqDrawdownA, {
        trail: nf(stats.trailCount),
        hardening: nf(stats.fundedHardeningCount),
      }),
    },
    {
      q: d.faqConsistencyQ,
      a: stats.noConsistencyFirms.length
        ? fill(d.faqConsistencyA, { firms: listFmt(stats.noConsistencyFirms) })
        : d.faqConsistencyAEmpty,
    },
    {
      q: d.faqFeesQ,
      a: stats.activationFirms.length
        ? fill(d.faqFeesA, { firms: listFmt(stats.activationFirms) })
        : d.faqFeesAEmpty,
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Tradegrape',
      url: `${SITE}/${l}`,
      description: d.metaDescription,
      inLanguage: l,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  const steps = [
    { n: 1, t: d.journalStep1Title, b: d.journalStep1Body },
    { n: 2, t: d.journalStep2Title, b: d.journalStep2Body },
    { n: 3, t: d.journalStep3Title, b: d.journalStep3Body },
  ];
  const facts = [
    { t: d.honesty1Title, b: d.honesty1Body },
    { t: d.honesty2Title, b: d.honesty2Body },
    { t: d.honesty3Title, b: d.honesty3Body },
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
          {/* Déconnecté : /signup. Connecté : /app. Bascule côté client. */}
          <JournalCta signedOutLabel={d.ctaJournal} signedInLabel={d.ctaJournalSignedIn} />
        </div>

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
              <span className="home-stat-note">
                {' · '}
                {stats.cheapest ? stats.cheapest.firmName : d.statCheapestEmpty}
              </span>
            </dt>
          </div>
        </dl>
      </section>

      {/* -------------------------------------- 1. APERÇU COMPARATEUR */}
      <section id="apercu" className="home-section">
        <h2 className="home-h2">{d.previewTitle}</h2>
        <p className="home-section-sub">{d.previewSub}</p>

        {preview.length === 0 ? (
          <p className="home-muted">{d.previewEmpty}</p>
        ) : (
          <div className="table-scroll">
            <div className="data-list home-preview" role="table" aria-label={d.previewTitle}>
              <div className="data-head" role="row">
                <span role="columnheader">{d.previewColFirm}</span>
                <span role="columnheader">{d.previewColPlan}</span>
                <span role="columnheader">{d.previewColSize}</span>
                <span role="columnheader">{d.previewColPrice}</span>
                <span role="columnheader">{d.previewColDrawdown}</span>
                <span role="columnheader">{d.previewColReviewed}</span>
              </div>
              {preview.map((o) => (
                <div key={o.id} className="data-row" role="row">
                  <span role="cell" data-label={d.previewColFirm} className="home-tfirm">
                    {o.firm.name}
                  </span>
                  <span role="cell" data-label={d.previewColPlan}>{o.plan.name}</span>
                  <span role="cell" data-label={d.previewColSize} className="num">{nf(o.size)}</span>
                  <span role="cell" data-label={d.previewColPrice} className="num home-tprice">
                    {o.totalPrice.known ? money(o.totalPrice.value, o.currency) : '—'}
                  </span>
                  <span role="cell" data-label={d.previewColDrawdown}>
                    <span className="num">{o.drawdown.type} {nf(o.drawdown.amount)}</span>
                    {o.fundedHardening.differs ? (
                      <span className="home-tbadge home-tbadge-bad">{d.previewHardening}</span>
                    ) : null}
                  </span>
                  <span role="cell" data-label={d.previewColReviewed} className="num home-treviewed">
                    {o.trust.reviewedAt ?? (
                      <span className="home-tbadge home-tbadge-warn">{d.previewNotVerified}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="home-section-cta">
          <Link href={comparatorHref(l)} className={buttonClasses({ size: 'md' })}>
            {fill(d.previewCta, { n: nf(stats.offerCount) })}
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------- 2. FIRMS */}
      <section id="firms" className="home-section">
        <h2 className="home-h2">{d.firmsTitle}</h2>
        <p className="home-section-sub">{d.firmsSub}</p>

        <ul className="home-firms">
          {stats.firms.map((f) => (
            <li key={f.slug} className="home-firm">
              <span className="home-firm-name">{f.name}</span>
              <span className="home-firm-price num">
                {f.entryPrice !== null ? (
                  <>
                    <span className="home-firm-from">{d.firmsFrom} </span>
                    {money(f.entryPrice, f.currency)}
                  </>
                ) : (
                  <span className="home-muted">{d.firmsNoPrice}</span>
                )}
              </span>
              <span className="home-firm-meta">
                <span className="num">{nf(f.offerCount)}</span> {d.firmsOffers}
                {f.promo ? (
                  <span className="home-firm-promo">
                    {f.promo.code}
                    {f.promo.discountPct != null ? ` −${nf(f.promo.discountPct)}%` : ''}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------- 3. JOURNAL */}
      <section id="journal" className="home-section home-journal">
        <div className="home-journal-text">
          <h2 className="home-h2">{d.journalTitle}</h2>
          <p className="home-section-sub">{d.journalIntro}</p>

          <ol className="home-steps">
            {steps.map((s) => (
              <li key={s.n} className="home-step">
                <span className="home-step-n num">{s.n}</span>
                <span className="home-step-body">
                  <span className="home-step-t">{s.t}</span>
                  <span className="home-step-b">{s.b}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="home-section-cta">
            <JournalCta signedOutLabel={d.ctaJournal} signedInLabel={d.ctaJournalSignedIn} />
          </div>
        </div>

        {/* Aperçu du dashboard — représentation du produit, chiffres d'exemple
            clairement étiquetés (§9 : pas de faux compteur « live »). */}
        <figure className="home-dash" aria-label={d.journalDashCaption}>
          <div className="home-dash-head">
            <span className="home-dash-account">{d.journalDashAccount}</span>
            <span className="home-dash-ex">{d.journalDashExample}</span>
          </div>
          <div className="home-dash-gauges">
            <div className="home-dash-gauge">
              <span className="home-dash-glabel">{d.journalDashDailyLabel}</span>
              <span className="home-dash-gval num">820&nbsp;$</span>
              <span className="home-dash-bar"><span style={{ width: '62%' }} /></span>
            </div>
            <div className="home-dash-gauge">
              <span className="home-dash-glabel">{d.journalDashFloorLabel}</span>
              <span className="home-dash-gval num">48&nbsp;600&nbsp;$</span>
              <span className="home-dash-bar"><span style={{ width: '40%' }} /></span>
            </div>
            <div className="home-dash-gauge">
              <span className="home-dash-glabel">{d.journalDashTargetLabel}</span>
              <span className="home-dash-gval num">1&nbsp;850 / 3&nbsp;000&nbsp;$</span>
              <span className="home-dash-bar"><span style={{ width: '61%' }} /></span>
            </div>
          </div>
          {/* Bloc payout : notre signature, « ce qu'il te manque ». */}
          <div className="home-dash-payout">
            <span className="home-dash-plabel">{d.journalDashPayoutTitle}</span>
            <span className="home-dash-pval">{d.journalDashPayoutMissing}</span>
          </div>
          <figcaption className="home-dash-cap">{d.journalDashCaption}</figcaption>
        </figure>
      </section>

      {/* ----------------------------------------------- 4. HONNÊTETÉ */}
      <section id="honnetete" className="home-section">
        <h2 className="home-h2">{d.honestyTitle}</h2>
        <div className="home-facts">
          {facts.map((f) => (
            <div key={f.t} className="home-fact">
              <h3 className="home-fact-t">{f.t}</h3>
              <p className="home-fact-b">{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ 5. FAQ */}
      <section id="faq" className="home-section">
        <h2 className="home-h2">{d.faqTitle}</h2>
        <div className="home-faq">
          {faq.map((f) => (
            <details key={f.q} className="home-faq-item">
              <summary className="home-faq-q">{f.q}</summary>
              <p className="home-faq-a">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="home-section-cta">
          <Link href={comparatorHref(l)} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
            {d.faqCompareCta}
          </Link>
        </div>
      </section>

      <SiteFooter locale={l} generatedAt={generatedAt} />
    </main>
  );
}
