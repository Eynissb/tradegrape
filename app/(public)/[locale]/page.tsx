import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { firmLogo, firmColor } from '@/lib/catalog/logos';
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

/* Icônes de section (trait, héritent la couleur de la pastille). */
function Hic({ name }: { name: 'compare' | 'firms' | 'journal' | 'shield' | 'help' | 'tag' | 'calendar' | 'bell' }) {
  const paths: Record<string, React.ReactNode> = {
    compare: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" /></>,
    firms: <><path d="M4 21V8l5-3 5 3v13" /><path d="M14 21V11l6 3v7" /><path d="M8 12h1.5M8 16h1.5" /></>,
    journal: <><path d="M6 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2z" /><path d="M9 8h6M9 12h6" /></>,
    shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1.3 1-1.3 1.9M12 17h.01" /></>,
    tag: <><path d="M12.6 3H6a3 3 0 0 0-3 3v6.6a2 2 0 0 0 .6 1.4l7 7a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8l-7-7A2 2 0 0 0 12.6 3Z" /><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8.5 15l2 2 4-4" /></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

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
  const preview = sortOffers(offers, 'total_price').slice(0, 8);
  // Meilleure note par firm (nos notes sont au niveau du plan) — pour le carrousel.
  const firmRatings = new Map<string, number>();
  for (const o of offers) {
    if (o.plan.rating != null) {
      const cur = firmRatings.get(o.firm.slug);
      if (cur == null || o.plan.rating > cur) firmRatings.set(o.firm.slug, o.plan.rating);
    }
  }

  const nf = (n: number) => n.toLocaleString(l === 'fr' ? 'fr-FR' : 'en-US');
  const shortSize = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));
  const reviewedDate = (() => {
    const dt = new Date(generatedAt);
    return Number.isNaN(dt.getTime())
      ? generatedAt
      : dt.toLocaleDateString(l === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();
  const ddTone = (t: string) => (t === 'TRAIL' ? 'bad' : t === 'EOD' ? 'warn' : 'ok');
  const noteTone = (r: number | null) => (r == null ? 'na' : r >= 8 ? 'ok' : r >= 4 ? 'warn' : 'bad');
  // Symbole $ devant pour l'USD (cohérent avec le comparateur), sinon code après.
  const money = (v: number, c: string) => (c === 'USD' ? `$${nf(v)}` : `${nf(v)} ${c}`);
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
    { t: d.honesty1Title, b: d.honesty1Body, ic: 'tag' as const, c: 'lime' },
    { t: d.honesty2Title, b: d.honesty2Body, ic: 'calendar' as const, c: 'amber' },
    { t: d.honesty3Title, b: d.honesty3Body, ic: 'bell' as const, c: 'magenta' },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Construit côté serveur, aucune entrée utilisateur.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---- HERO « donnée vivante » : texte éditorial à gauche, notre produit
             qui s'ANIME à droite (courbe d'équité qui se dessine, plancher de
             drawdown, marqueur de payout qui pulse, chips de comparaison qui
             flottent). Animations CSS pures, respectent prefers-reduced-motion. ---- */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-grid">
            <div className="home-hero-text">
              <span className="home-live"><span className="home-live-dot" aria-hidden="true" />{d.heroLive}</span>
              <h1 className="home-title">{d.heroTitle}</h1>
              <p className="home-sub">{d.heroSubtitle}</p>

              <div className="home-cta">
                <Link href={comparatorHref(l)} className={buttonClasses({ size: 'lg' })}>
                  {d.ctaCompare}
                </Link>
                {/* Déconnecté : /signup. Connecté : /app. Bascule côté client. */}
                <JournalCta signedOutLabel={d.ctaJournal} signedInLabel={d.ctaJournalSignedIn} />
              </div>

              <dl className="home-statbar">
                <div className="home-statcell">
                  <dd className="home-stat-num num">{nf(stats.firmCount)}</dd>
                  <dt className="home-stat-label">{d.statFirms}</dt>
                </div>
                <div className="home-statcell">
                  <dd className="home-stat-num num">{nf(stats.offerCount)}</dd>
                  <dt className="home-stat-label">{d.statOffers}</dt>
                </div>
                <div className="home-statcell">
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
            </div>

            {/* Visualisation vivante — décor animé (aria-hidden). */}
            <div className="home-viz" aria-hidden="true">
              <div className="home-viz-card">
                <div className="home-viz-top">
                  <span className="home-viz-title">{d.heroVizAccount}</span>
                  <span className="home-viz-live"><i />LIVE</span>
                </div>
                <svg className="home-viz-chart" viewBox="0 0 340 168" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="rgba(192,75,255,.42)" />
                      <stop offset="1" stopColor="rgba(91,63,255,0)" />
                    </linearGradient>
                    <linearGradient id="eqline" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#5b3fff" />
                      <stop offset=".55" stopColor="#c04bff" />
                      <stop offset="1" stopColor="#ff3ba6" />
                    </linearGradient>
                  </defs>
                  <path className="home-viz-grid" d="M0 42h340M0 84h340M0 126h340" />
                  <path className="home-viz-floor" d="M0 140h340" />
                  <path className="home-viz-fill" d="M0 128 C40 122 66 104 104 108 S176 74 214 62 S300 34 340 40 V168 H0 Z" fill="url(#eqfill)" />
                  <path className="home-viz-eq" d="M0 128 C40 122 66 104 104 108 S176 74 214 62 S300 34 340 40" stroke="url(#eqline)" />
                  <circle className="home-viz-dot" cx="340" cy="40" r="5" />
                </svg>
                <div className="home-viz-payout">
                  <span className="home-viz-plabel">{d.heroVizPayout}</span>
                  <strong className="home-viz-pval num">{d.heroVizPayoutVal}</strong>
                </div>
              </div>
              <span className="home-viz-chip home-viz-chip--a"><b className="num">10</b> Lucid</span>
              <span className="home-viz-chip home-viz-chip--b">EOD&nbsp;→&nbsp;TRAIL</span>
              <span className="home-viz-chip home-viz-chip--c"><b className="num">$99</b></span>
            </div>
          </div>
        </div>
      </section>

      <main className="pub-main home">
      {/* -------------------------- 0. OFFRES (carrousel, signature propfirmmatch) */}
      <section id="offres" className="home-section">
        <div className="home-h2-row">
          <span className="home-ic home-ic--magenta"><Hic name="tag" /></span>
          <div>
            <h2 className="home-h2">{d.offersTitle}</h2>
            <p className="home-section-sub">{d.offersSub}</p>
          </div>
        </div>
        <div className="home-offers">
          {stats.firms.map((f) => {
            const logo = firmLogo(f.slug);
            const accent = firmColor(f.name);
            const rating = firmRatings.get(f.slug);
            return (
              <Link
                key={f.slug}
                href={comparatorHref(l)}
                className="home-offer"
                style={{ '--firm-accent': accent } as React.CSSProperties}
              >
                <span
                  className={`home-offer-logo${logo && !logo.light ? ' lift' : ''}`}
                  style={logo ? undefined : { background: accent }}
                  aria-hidden="true"
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                  ) : (
                    f.name.trim().slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="home-offer-txt">
                  <span className="home-offer-name">{f.name}</span>
                  <span className="home-offer-rating">
                    {rating != null ? <><b className="num">★ {rating}</b>/10</> : d.offersNew}
                  </span>
                </span>
                <span className="home-offer-deal">
                  {f.promo ? (
                    <>
                      {f.promo.discountPct != null ? <b className="num">−{f.promo.discountPct}%</b> : null}
                      <code>{f.promo.code}</code>
                    </>
                  ) : f.entryPrice !== null ? (
                    <><span className="home-offer-from">{d.firmsFrom}</span> <b className="num">{money(f.entryPrice, f.currency)}</b></>
                  ) : (
                    <span className="home-muted">—</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* -------------------------- 1. COMPARATIF (pièce maîtresse) */}
      <section id="apercu" className="home-section">
        <div className="home-section-head">
          <div className="home-h2-row">
            <span className="home-ic home-ic--indigo"><Hic name="compare" /></span>
            <div>
              <h2 className="home-h2">{d.previewTitle}</h2>
              <p className="home-section-sub">{d.previewSub}</p>
            </div>
          </div>
          <span className="home-live home-live--sm">
            <span className="home-live-dot" aria-hidden="true" />
            {d.previewLive} · {reviewedDate}
          </span>
        </div>

        {preview.length === 0 ? (
          <p className="home-muted">{d.previewEmpty}</p>
        ) : (
          <div className="table-scroll">
            <div className="data-list home-preview" role="table" aria-label={d.previewTitle}>
              <div className="data-head" role="row">
                <span role="columnheader">{d.previewColFirm}</span>
                <span role="columnheader">{d.previewColNote}</span>
                <span role="columnheader">{d.previewColSize}</span>
                <span role="columnheader">{d.previewColPrice}</span>
                <span role="columnheader">{d.previewColDrawdown}</span>
                <span role="columnheader">{d.previewColPromo}</span>
              </div>
              {preview.map((o, idx) => {
                const logo = firmLogo(o.firm.slug);
                return (
                  <div key={o.id} className="data-row" role="row">
                    <span role="cell" data-label={d.previewColFirm} className="home-tfirm">
                      <span className={`home-tlogo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                        ) : (
                          o.firm.name.trim().slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="home-tfirm-txt">
                        <span className="home-tfirm-name">{o.firm.name}</span>
                        <span className="home-tfirm-plan">{o.plan.name}</span>
                        {idx === 0 ? <span className="home-best">{d.bestPrice}</span> : null}
                      </span>
                    </span>
                    <span role="cell" data-label={d.previewColNote}>
                      <span className={`home-note home-note--${noteTone(o.plan.rating)}`}>
                        {o.plan.rating ?? '–'}
                      </span>
                    </span>
                    <span role="cell" data-label={d.previewColSize} className="num">{shortSize(o.size)}</span>
                    <span role="cell" data-label={d.previewColPrice} className="num home-tprice">
                      {o.totalPrice.known ? money(o.totalPrice.value, o.currency) : '—'}
                    </span>
                    <span role="cell" data-label={d.previewColDrawdown} className="home-tdd">
                      <span className={`home-dd-badge home-dd-badge--${ddTone(o.drawdown.type)}`}>{o.drawdown.type}</span>
                      <span className="num">{nf(o.drawdown.amount)}</span>
                      {o.fundedHardening.differs ? (
                        <span className="home-tbadge home-tbadge-bad">{d.previewHardening}</span>
                      ) : null}
                    </span>
                    <span role="cell" data-label={d.previewColPromo} className="home-tpromo">
                      {o.trust.promo ? (
                        <>
                          <code>{o.trust.promo.code}</code>
                          {o.trust.promo.discountPct != null ? (
                            <span className="home-tpromo-pct num"> −{o.trust.promo.discountPct}%</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="home-muted">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
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
        <div className="home-h2-row">
          <span className="home-ic home-ic--lime"><Hic name="firms" /></span>
          <div>
            <h2 className="home-h2">{d.firmsTitle}</h2>
            <p className="home-section-sub">{d.firmsSub}</p>
          </div>
        </div>

        <ul className="home-firms">
          {stats.firms.map((f) => {
            const logo = firmLogo(f.slug);
            const accent = firmColor(f.name);
            return (
            <li key={f.slug} className="home-firm" style={{ '--firm-accent': accent } as React.CSSProperties}>
              <span className="home-firm-head">
                <span
                  className={`home-firm-logo${logo && !logo.light ? ' lift' : ''}`}
                  style={logo ? undefined : { background: accent }}
                  aria-hidden="true"
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                  ) : (
                    f.name.trim().slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="home-firm-name">{f.name}</span>
              </span>
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
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------------------- 3. JOURNAL */}
      <section id="journal" className="home-section home-journal">
        <div className="home-journal-text">
          <div className="home-h2-row">
            <span className="home-ic home-ic--magenta"><Hic name="journal" /></span>
            <div>
              <h2 className="home-h2">{d.journalTitle}</h2>
              <p className="home-section-sub">{d.journalIntro}</p>
            </div>
          </div>

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
        <div className="home-h2-row">
          <span className="home-ic home-ic--amber"><Hic name="shield" /></span>
          <h2 className="home-h2">{d.honestyTitle}</h2>
        </div>
        <div className="home-facts">
          {facts.map((f) => (
            <div key={f.t} className="home-fact">
              <span className={`home-ic home-ic--${f.c}`}><Hic name={f.ic} /></span>
              <h3 className="home-fact-t">{f.t}</h3>
              <p className="home-fact-b">{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ 5. FAQ */}
      <section id="faq" className="home-section">
        <div className="home-h2-row">
          <span className="home-ic home-ic--indigo"><Hic name="help" /></span>
          <h2 className="home-h2">{d.faqTitle}</h2>
        </div>
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
    </>
  );
}
