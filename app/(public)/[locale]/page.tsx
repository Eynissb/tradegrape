import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { firmLogo, firmColor, platformLogo } from '@/lib/catalog/logos';
import { buildHomeStats } from '@/lib/catalog/home-stats';
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
  // Meilleure note par firm (nos notes sont au niveau du plan) — pour le carrousel.
  const firmRatings = new Map<string, number>();
  for (const o of offers) {
    if (o.plan.rating != null) {
      const cur = firmRatings.get(o.firm.slug);
      if (cur == null || o.plan.rating > cur) firmRatings.set(o.firm.slug, o.plan.rating);
    }
  }

  // CLASSEMENT firm-par-firm (colonnes façon propfirmmatch), enrichi depuis les
  // offres. Classé sur la note puis la couverture — jamais sur la commission.
  const bySlug = new Map(offers.map((o) => [o.firm.slug, o.firm]));
  const firmRows = [...bySlug.values()]
    .map((firm) => {
      const fo = offers.filter((o) => o.firm.slug === firm.slug);
      const maxSize = Math.max(...fo.map((o) => o.size));
      const stat = stats.firms.find((s) => s.slug === firm.slug);
      return {
        slug: firm.slug,
        name: firm.name,
        country: firm.country,
        foundedYear: firm.foundedYear,
        rating: firmRatings.get(firm.slug) ?? null,
        platforms: [...new Set(fo.flatMap((o) => o.platforms))].slice(0, 4),
        maxAlloc: firm.maxAccounts ? maxSize * firm.maxAccounts : maxSize,
        offerCount: fo.length,
        currency: fo[0]?.currency ?? 'USD',
        promo: stat?.promo ?? null,
      };
    })
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.offerCount - a.offerCount || a.name.localeCompare(b.name));

  const compactMoney = (v: number, c: string) => {
    const loc = l === 'fr' ? 'fr-FR' : 'en-US';
    const n =
      v >= 1_000_000
        ? `${(v / 1_000_000).toLocaleString(loc, { maximumFractionDigits: 2 })}M`
        : v >= 1000
          ? `${(v / 1000).toLocaleString(loc)}k`
          : `${v}`;
    return c === 'USD' ? `$${n}` : `${n} ${c}`;
  };

  const nf = (n: number) => n.toLocaleString(l === 'fr' ? 'fr-FR' : 'en-US');
  const reviewedDate = (() => {
    const dt = new Date(generatedAt);
    return Number.isNaN(dt.getTime())
      ? generatedAt
      : dt.toLocaleDateString(l === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();
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

      {/* ---- HERO SOBRE (réf. propfirmmatch) : titre serré + CTA, la donnée
             prend le relais tout de suite. Pas de décor animé, pas de glow —
             le contraste vient du fond plat et des accents saturés. ---- */}
      <section className="home-hero">
        <div className="home-hero-inner">
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
      </section>

      <main className="pub-main home">
      {/* -------------------------- 1. LE CLASSEMENT (pièce maîtresse, réf. propfirmmatch) */}
      <section id="apercu" className="home-section">
        <div className="home-section-head">
          <div className="home-h2-row">
            <span className="home-ic home-ic--indigo"><Hic name="compare" /></span>
            <div>
              <h2 className="home-h2">{d.rankTitle}</h2>
              <p className="home-section-sub">{d.rankSub}</p>
            </div>
          </div>
          <span className="home-live home-live--sm">
            <span className="home-live-dot" aria-hidden="true" />
            {d.previewLive} · {reviewedDate}
          </span>
        </div>

        {firmRows.length === 0 ? (
          <p className="home-muted">{d.previewEmpty}</p>
        ) : (
          <div className="table-scroll">
            <div className="data-list home-rank" role="table" aria-label={d.rankTitle}>
              <div className="data-head" role="row">
                <span role="columnheader">{d.colRank}</span>
                <span role="columnheader">{d.previewColFirm}</span>
                <span role="columnheader">{d.previewColNote}</span>
                <span role="columnheader">{d.colCountry}</span>
                <span role="columnheader">{d.colSince}</span>
                <span role="columnheader">{d.colPlatforms}</span>
                <span role="columnheader">{d.colAlloc}</span>
                <span role="columnheader">{d.previewColPromo}</span>
                <span role="columnheader" aria-label={d.rankSee} />
              </div>
              {firmRows.map((f, idx) => {
                const logo = firmLogo(f.slug);
                return (
                  <div key={f.slug} className="data-row home-rank-row" role="row">
                    <span role="cell" data-label={d.colRank} className="home-rank-num num">
                      <span className={`home-rank-badge${idx < 3 ? ` home-rank-badge--top home-rank-badge--${idx + 1}` : ''}`}>
                        {idx + 1}
                      </span>
                    </span>
                    <span role="cell" data-label={d.previewColFirm} className="home-tfirm">
                      <span className={`home-tlogo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                        ) : (
                          f.name.trim().slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="home-tfirm-txt">
                        <span className="home-tfirm-name">{f.name}</span>
                        <span className="home-tfirm-plan">{fill(d.rankOffers, { n: nf(f.offerCount) })}</span>
                      </span>
                    </span>
                    <span role="cell" data-label={d.previewColNote}>
                      {f.rating != null ? (
                        <span className={`home-note home-note--${noteTone(f.rating)}`}>{f.rating}</span>
                      ) : (
                        <span className="home-rank-tbd">{d.rankNoRating}</span>
                      )}
                    </span>
                    <span role="cell" data-label={d.colCountry} className="home-rank-flag">
                      {f.country ? (
                        <span className="home-rank-cc">{f.country.toUpperCase()}</span>
                      ) : (
                        <span className="home-muted">—</span>
                      )}
                    </span>
                    <span role="cell" data-label={d.colSince} className="num">
                      {f.foundedYear ?? <span className="home-muted">—</span>}
                    </span>
                    <span role="cell" data-label={d.colPlatforms} className="home-rank-plats">
                      {f.platforms.length ? (
                        f.platforms.map((p) => {
                          const pl = platformLogo(p);
                          return (
                            <span key={p} className="home-plat" title={p}>
                              {pl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pl.url} alt={p} />
                              ) : (
                                <span className="home-plat-txt">{p.slice(0, 2)}</span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="home-muted">—</span>
                      )}
                    </span>
                    <span role="cell" data-label={d.colAlloc} className="num home-rank-alloc">
                      {compactMoney(f.maxAlloc, f.currency)}
                    </span>
                    <span role="cell" data-label={d.previewColPromo} className="home-tpromo">
                      {f.promo ? (
                        <>
                          <code>{f.promo.code}</code>
                          {f.promo.discountPct != null ? (
                            <span className="home-tpromo-pct num"> −{f.promo.discountPct}%</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="home-muted">—</span>
                      )}
                    </span>
                    <span role="cell" className="home-rank-act">
                      <Link href={comparatorHref(l)} className={`${buttonClasses({ size: 'sm', variant: 'ghost' })} home-rank-btn`}>
                        {d.rankSee}
                      </Link>
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
