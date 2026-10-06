import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { firmLogo, platformLogo } from '@/lib/catalog/logos';
import { buildHomeStats } from '@/lib/catalog/home-stats';
import { HOME_DICTS } from '@/lib/i18n/home';
import { comparatorHref, isLocale, type Locale } from '@/lib/i18n/comparator';
import { buttonClasses } from '@/components/ui/Button';
import SiteFooter from '@/app/(public)/_home/SiteFooter';
import HeroTopTen from '@/app/(public)/_home/HeroTopTen';
import CopyCode from '@/app/(public)/_home/CopyCode';
import NoteRing from '@/app/(public)/_home/NoteRing';
import EmailCapture from '@/app/(public)/_home/EmailCapture';

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DIRECTION CONTRACT — home publique Tradegrape (Impeccable new-work, seed 9a410e7a)
 *
 * THESIS : la home EST un terminal financier, pas une landing SaaS. Le mécanisme
 *   produit — on EXÉCUTE les règles que les autres décrivent — se prouve par une
 *   table de comptes dense, alignée, scannable. Refuse la grille de cartes-marketing
 *   propfirmmatch et son opposé (fintech pastel arrondie).
 * OWN-WORLD : fond noir violacé plat (#070510), filets 1px, aucune carte en verre
 *   sur les données. Chiffres de GRILLE en JetBrains Mono tabulaire (`.tnum`) — la
 *   §2 « mono rejeté » rouverte pour CETTE grille seule. Titres Sora, corps Inter.
 *   États lime/amber/red pour le risque, jamais l'accent de marque. Un seul bloc en
 *   dégradé sur la page : le payout « ce qu'il te manque ».
 * STORY : le visiteur comprend en quelques secondes qu'ici on ne décrit pas les
 *   règles, on les calcule ; il scanne la table (prix TTC, trailing, durcissement
 *   financé), voit le journal exécuter, et clique Comparer / Ouvrir le journal.
 * FIRST VIEWPORT : bandeau-terminal serré (phrase de marque + 2 CTA + readout de
 *   chiffres mono) puis, tout de suite, la grande table des offres plein cadre.
 * FORM : terminal financier / grande table de cotation. Grounded #1 de ma liste
 *   (l'écran que le trader fixe), épinglé par l'utilisateur au 2e re-tirage (steer)
 *   après élimination de la bathymétrie (#4, tirage 1) et du tableau annunciator
 *   (#3, tirage 2). Seed 9a410e7a.
 * FINISH : unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Porte d'entrée SEO : pré-générée (SSG) et régénérée à l'heure (ISR). Tous les
 * CHIFFRES viennent du catalogue publié, jamais codés en dur — pour ne pas périmer
 * comme la home des concurrents.
 */

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tradegrape.com';

/* Icônes du hero (trait, héritent la couleur). */
function HeroIcon({ name }: { name: 'spark' | 'receipt' | 'shield' | 'chart' }) {
  const paths: Record<string, React.ReactNode> = {
    spark: <path d="M12 2.5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="currentColor" stroke="none" />,
    receipt: <><path d="M5 3h14v18l-3-2-3 2-3-2-2 2V3z" /><path d="M8 8h8M8 12h6" /></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/** Mini-glyphe de la courbe de drawdown : TRAIL monte (le piège), EOD en marches,
 *  STATIC plat. Le badge devient lisible ET pédagogique. */
function DrawGlyph({ type }: { type: 'EOD' | 'TRAIL' | 'STATIC' }) {
  return (
    <svg className="term-badge-gl" viewBox="0 0 22 13" aria-hidden="true">
      {type === 'STATIC' ? (
        <line x1="2" y1="7" x2="20" y2="7" />
      ) : type === 'EOD' ? (
        <path d="M2 11 H8 V7.5 H14 V4 H20" />
      ) : (
        <>
          <path d="M2 11 L19 3" />
          <circle className="term-badge-dot" cx="19" cy="3" r="2.1" />
        </>
      )}
    </svg>
  );
}

/* Rubans « flow » du hero (réf. Stripe, transposés en indigo→fuchsia→magenta) :
   une bande de courbes parallèles pré-calculées (statiques, SSR), animées en CSS.
   L'opacité culmine au centre de la bande (fondu gaussien). */
const HERO_FLOW = Array.from({ length: 34 }, (_, i) => {
  const t = i / 33;
  const y = 190 + t * 400;
  const a = 55 + t * 45;
  return {
    d: `M -160 ${Math.round(y + 90)} C 380 ${Math.round(y + a)}, 720 ${Math.round(y - a)}, 1040 ${Math.round(y - a * 1.4)} S 1600 ${Math.round(y - a * 0.6)}, 1780 ${Math.round(y - a * 1.2)}`,
    o: +(0.1 + Math.sin(t * Math.PI) * 0.5).toFixed(2),
  };
});

/* Vague de lignes PARALLÈLES (réf. Stripe) pour « Comment ça marche ». Construction
   « courbes de niveau » : toutes les lignes partagent la même ondulation, décalées
   verticalement — donc elles ne se croisent JAMAIS (le croisement faisait un « nœud
   papillon »). Le ruban respire (se resserre puis s'ouvre) le long de x → il coule.
   Dégradé indigo→fuchsia→magenta. Pré-calculé (SSR), animé en CSS. */
const HOW_WAVE = (() => {
  const N = 46;         // nombre de lignes
  const S = 22;         // points échantillonnés par ligne
  const X0 = -180, X1 = 1620;   // débord hors viewBox → bords hors écran (full-bleed)
  // Catmull-Rom → Bézier cubique : polyligne lisse sans facettes.
  const smooth = (pts: [number, number][]) => {
    let d = `M ${pts[0][0]} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  // Axe du ruban : ondulation douce + léger basculement diagonal.
  const centerY = (u: number) =>
    244 + (u - 0.5) * 74 + Math.sin(u * Math.PI * 1.25 + 0.6) * 44 + Math.sin(u * Math.PI * 2.7 + 1.1) * 13;
  // Épaisseur du ruban : respire de ~250 à ~410 → pincement/ouverture sans croisement.
  // Plancher assez haut pour que les lignes ne fusionnent jamais en un pâté brillant.
  const spread = (u: number) => 330 + Math.sin(u * Math.PI * 1.7 - 0.4) * 82;
  return Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);   // 0..1, position dans le ruban
    const pts = Array.from({ length: S }, (_, s): [number, number] => {
      const x = X0 + (X1 - X0) * (s / (S - 1));
      const u = x / 1440;
      return [Math.round(x), centerY(u) + (t - 0.5) * spread(u)];
    });
    return {
      d: smooth(pts),
      o: +(0.22 + (1 - Math.min(1, Math.abs(t - 0.5) * 2)) * 0.55).toFixed(2),
    };
  });
})();

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

type DrawTone = 'trail' | 'flat';
type Tone = 'ok' | 'warn' | 'bad' | 'na';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const d = HOME_DICTS[l];

  const { offers, generatedAt } = await loadPublicCatalog();
  const stats = buildHomeStats(offers);
  const loc = l === 'fr' ? 'fr-FR' : 'en-US';

  const nf = (n: number) => n.toLocaleString(loc);
  const money = (v: number, c: string) => (c === 'USD' ? `$${nf(v)}` : `${nf(v)} ${c}`);
  const compactMoney = (v: number, c: string) => {
    const n =
      v >= 1_000_000
        ? `${(v / 1_000_000).toLocaleString(loc, { maximumFractionDigits: 2 })}M`
        : v >= 1000
          ? `${(v / 1000).toLocaleString(loc)}k`
          : `${v}`;
    return c === 'USD' ? `$${n}` : `${n} ${c}`;
  };
  const fill = (tpl: string, map: Record<string, string>) =>
    Object.entries(map).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const listFmt = (xs: string[]) => {
    if (xs.length <= 1) return xs.join('');
    const conj = l === 'fr' ? ' et ' : ' and ';
    return xs.slice(0, -1).join(', ') + conj + xs[xs.length - 1];
  };
  const shortDate = (iso: string | null) => {
    if (!iso) return null;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime())
      ? iso
      : dt.toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const reviewedDate = (() => {
    const dt = new Date(generatedAt);
    return Number.isNaN(dt.getTime())
      ? generatedAt
      : dt.toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();
  const noteTone = (r: number | null): Tone => (r == null ? 'na' : r >= 8 ? 'ok' : r >= 4 ? 'warn' : 'bad');

  /* ---- Lignes de la table terminal : les OFFRES réelles, triées sur la fiabilité
     (note du plan, faute de health score calculé), puis vérifiées d'abord, puis
     prix TTC croissant. Jamais sur la commission (§7). ---- */
  const rows = [...offers]
    .map((o) => {
      const dt = o.drawdown.type;
      const drawTone: DrawTone = dt === 'TRAIL' ? 'trail' : 'flat';
      const h = o.fundedHardening;
      let hardLabel: string;
      let hardTone: Tone;
      if (!h.differs) {
        hardLabel = d.termHardeningUnchanged;
        hardTone = 'ok';
      } else if (dt !== o.funded.drawdown.type) {
        hardLabel = `${dt} → ${o.funded.drawdown.type}`;
        hardTone = 'bad';
      } else if (o.drawdown.amount !== o.funded.drawdown.amount) {
        hardLabel = `${compactMoney(o.drawdown.amount, o.currency)} → ${compactMoney(o.funded.drawdown.amount, o.currency)}`;
        hardTone = 'bad';
      } else {
        hardLabel = d.termHardenedShort;
        hardTone = 'bad';
      }
      return {
        id: o.id,
        firmSlug: o.firm.slug,
        firmName: o.firm.name,
        planName: o.plan.name,
        rating: o.plan.rating,
        size: o.size,
        currency: o.currency,
        totalPrice: o.totalPrice.known ? o.totalPrice.value : null,
        priceIsFloor: o.totalPriceIsFloor,
        priceRegular: o.priceRegular,
        isRecurring: o.isRecurring,
        minis: o.sizing.minis,
        micros: o.sizing.micros,
        profitTarget: o.profitTarget,
        dailyLoss: o.dailyLossLimit,
        minDays: o.minTradingDays,
        drawType: dt,
        drawAmount: o.drawdown.amount,
        drawTone,
        hardLabel,
        hardTone,
        fundedDrawType: o.funded.drawdown.type,
        hasConsistency: o.hasConsistency,
        consistencyPct: o.consistencyPct,
        split: o.funded.profitSplit,
        platforms: [...new Set(o.platforms)].slice(0, 4),
        reviewedAt: o.trust.reviewedAt,
        promo: o.trust.promo,
        verified: o.trust.verified,
      };
    })
    .sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      if (rb !== ra) return rb - ra;
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      const pa = a.totalPrice ?? Number.POSITIVE_INFINITY;
      const pb = b.totalPrice ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.firmName.localeCompare(b.firmName) || a.size - b.size;
    });

  /* Agrégat FIRM-level : alimente le Top 10 du hero, la vue « Firms » et la vue
     « Codes promo ». Note = meilleure note du plan ; classé fiabilité puis couverture. */
  const firmRows = (() => {
    const acc = new Map<
      string,
      {
        slug: string; name: string; rating: number | null; country: string | null;
        foundedYear: number | null; maxAccounts: number | null; offerCount: number;
        entryPrice: number | null; currency: string; platforms: Set<string>; maxSize: number;
        promo: { code: string; discountPct: number | null; permanent: boolean; exclusive: boolean } | null;
      }
    >();
    for (const o of offers) {
      let cur = acc.get(o.firm.slug);
      if (!cur) {
        cur = {
          slug: o.firm.slug, name: o.firm.name, rating: o.plan.rating, country: o.firm.country,
          foundedYear: o.firm.foundedYear, maxAccounts: o.firm.maxAccounts, offerCount: 0,
          entryPrice: null, currency: o.currency, platforms: new Set<string>(), maxSize: 0,
          promo: o.trust.promo
            ? { code: o.trust.promo.code, discountPct: o.trust.promo.discountPct, permanent: o.trust.promo.permanent, exclusive: o.trust.promo.exclusive }
            : null,
        };
        acc.set(o.firm.slug, cur);
      }
      cur.offerCount += 1;
      if (o.plan.rating != null && (cur.rating == null || o.plan.rating > cur.rating)) cur.rating = o.plan.rating;
      const entry = o.totalPrice.known ? o.totalPrice.value : null;
      if (entry != null && (cur.entryPrice == null || entry < cur.entryPrice)) cur.entryPrice = entry;
      for (const p of o.platforms) cur.platforms.add(p);
      if (o.size > cur.maxSize) cur.maxSize = o.size;
      if (!cur.promo && o.trust.promo) {
        cur.promo = { code: o.trust.promo.code, discountPct: o.trust.promo.discountPct, permanent: o.trust.promo.permanent, exclusive: o.trust.promo.exclusive };
      }
    }
    return [...acc.values()]
      .map((f) => ({
        slug: f.slug, name: f.name, rating: f.rating, country: f.country, foundedYear: f.foundedYear,
        offerCount: f.offerCount, entryPrice: f.entryPrice, currency: f.currency,
        platforms: [...f.platforms].slice(0, 4),
        platformTotal: f.platforms.size,
        maxAlloc: f.maxAccounts ? f.maxSize * f.maxAccounts : f.maxSize,
        promo: f.promo,
      }))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.offerCount - a.offerCount || a.name.localeCompare(b.name));
  })();
  const firmTop = firmRows.slice(0, 10);
  const promoRows = firmRows.filter((f) => f.promo);
  /* Échelle de la barre d'allocation : proportionnelle à la plus grosse alloc du
     tableau — la barre montre l'ordre de grandeur relatif, pas une valeur absolue. */
  const firmAllocMax = Math.max(1, ...firmRows.map((f) => f.maxAlloc || 0));
  /* Données sérialisables du carrousel Top 10 (rendu par un client component pour
     les flèches de navigation). Prix et tons pré-formatés côté serveur. */
  const topCards = firmTop.map((f, i) => ({
    slug: f.slug,
    name: f.name,
    rank: i + 1,
    rating: f.rating,
    ratingTone: f.rating != null ? noteTone(f.rating) : null,
    priceLabel: f.entryPrice != null ? `${d.termFloor} ${money(f.entryPrice, f.currency)}` : null,
    logo: firmLogo(f.slug),
    monogram: f.name.trim().slice(0, 2).toUpperCase(),
  }));

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
      a: fill(d.faqDrawdownA, { trail: nf(stats.trailCount), hardening: nf(stats.fundedHardeningCount) }),
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

  const toneCell = (t: Tone) => `term-${t}`;

  return (
    <>
      <script
        type="application/ld+json"
        // Construit côté serveur, aucune entrée utilisateur.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Marqueur de contrat de direction, greppable dans le build de prod (seed). */}
      <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!-- impeccable:direction seed=9a410e7a world=financial-terminal mode=persuade -->' }} />

      {/* ════════════════════ HERO — PRÉSENTATION COMPARATEUR ════════════════════
          Centré, atmosphérique (réf. demandée par l'utilisateur), transposé en
          indigo→fuchsia (jamais bleu, §2). Badge honnête, gros titre en fondu,
          features réelles, double CTA, puis le Top 10 firms façon Netflix. */}
      <header className="cap-hero">
        <div className="cap-aura" aria-hidden="true" />
        {/* Motion « Stripe » adapté à la marque : nappe de couleur qui dérive +
            rubans de lignes qui coulent. Décoratif, derrière le contenu, coupé en
            prefers-reduced-motion. */}
        <div className="cap-mesh" aria-hidden="true">
          <span className="cap-blob cap-blob--1" />
          <span className="cap-blob cap-blob--2" />
          <span className="cap-blob cap-blob--3" />
        </div>
        <svg className="cap-flow" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="capFlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5b3fff" />
              <stop offset="50%" stopColor="#c04bff" />
              <stop offset="100%" stopColor="#ff3ba6" />
            </linearGradient>
          </defs>
          <g className="cap-flow-g" stroke="url(#capFlow)" fill="none" strokeWidth="1.2">
            {HERO_FLOW.map((p, i) => (
              <path key={i} d={p.d} style={{ opacity: p.o }} />
            ))}
          </g>
        </svg>
        <div className="cap-stars" aria-hidden="true" />
        <div className="cap-hero-inner">
          <p className="cap-badge">
            <span className="cap-badge-ic" aria-hidden="true"><HeroIcon name="spark" /></span>
            {d.heroBadge}
          </p>

          <h1 className="cap-title">
            {d.termTitleLead} <span className="cap-title-fade">{d.termTitleEm}</span>
          </h1>
          <p className="cap-sub">{d.heroLede}</p>

          <ul className="cap-feats">
            <li className="cap-feat"><span className="cap-feat-ic" aria-hidden="true"><HeroIcon name="receipt" /></span>{d.heroFeat1}</li>
            <li className="cap-feat"><span className="cap-feat-ic" aria-hidden="true"><HeroIcon name="shield" /></span>{d.heroFeat2}</li>
            <li className="cap-feat"><span className="cap-feat-ic" aria-hidden="true"><HeroIcon name="chart" /></span>{d.heroFeat3}</li>
          </ul>

          <div className="cap-cta">
            <Link href={comparatorHref(l)} className={`${buttonClasses({ size: 'lg' })} cap-btn`}>{d.ctaCompare}</Link>
            <Link href={`/app`} className={`${buttonClasses({ variant: 'secondary', size: 'lg' })} cap-btn`}>{d.ctaJournalDiscover}</Link>
          </div>

          {/* Top 10 firms — carrousel navigable façon Netflix (client component). */}
          {topCards.length > 0 ? (
            <HeroTopTen
              cards={topCards}
              href={comparatorHref(l)}
              labels={{
                title: d.heroTopTitle,
                verified: d.heroTopVerified,
                noRating: d.rankNoRating,
                prev: d.heroTopPrev,
                next: d.heroTopNext,
              }}
            />
          ) : null}
        </div>
      </header>

      <main className="pub-main term">
        {/* ═══════════════════════ LE TERMINAL DES OFFRES ═══════════════════════ */}
        <section id="offres" className="term-section">
          <div className="term-head">
            <div>
              <h2 className="term-h2">{d.termTitle}</h2>
            </div>
            <span className="term-count tnum">{fill(d.termCount, { n: nf(stats.offerCount) })}</span>
          </div>

          {/* Tableau à 3 VUES (onglets CSS, pas de JS) : Firms · Challenges · Codes promo. */}
          <div className="term-tabs-wrap">
            <input type="radio" name="term-view" id="tv-firms" className="term-tab-in" defaultChecked />
            <input type="radio" name="term-view" id="tv-challenges" className="term-tab-in" />
            <input type="radio" name="term-view" id="tv-promos" className="term-tab-in" />

            <div className="term-tabs">
              <label htmlFor="tv-firms" className="term-tab">{d.tabFirms}</label>
              <label htmlFor="tv-challenges" className="term-tab">{d.tabChallenges}</label>
              <label htmlFor="tv-promos" className="term-tab">{d.tabPromos}</label>
            </div>

            {/* ─────────── VUE FIRMS (niveau firm) ─────────── */}
            <div className="term-view" data-view="firms">
              <p className="term-view-sub">{d.firmsViewSub}</p>
              <div className="term-scroll">
                <div className="term-grid term-grid--firms">
                  <div className="term-row term-hrow" aria-hidden="true">
                    <span className="term-c-rank">{d.colRank}</span>
                    <span>{d.previewColFirm}</span>
                    <span className="term-c-center">{d.previewColNote}</span>
                    <span className="term-c-center">{d.colCountry}</span>
                    <span className="term-c-center">{d.colSince}</span>
                    <span>{d.colPlatforms}</span>
                    <span className="term-c-num">{d.colAlloc}</span>
                    <span>{d.previewColPromo}</span>
                    <span />
                  </div>
                  {firmRows.map((f, idx) => {
                    const logo = firmLogo(f.slug);
                    return (
                      <Link
                        key={f.slug}
                        href={comparatorHref(l)}
                        className={`term-row term-frow${idx === 0 ? ' is-top' : ''}`}
                        style={{ '--i': idx } as React.CSSProperties}
                        aria-label={`${f.name}, ${d.previewColNote} ${f.rating ?? d.rankNoRating} · ${d.termRowAction}`}
                      >
                        <span className="term-c-rank tnum" data-label={d.colRank}>{idx + 1}</span>
                        <span className="term-firm" data-label={d.previewColFirm}>
                          <span className={`term-logo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                            ) : (
                              f.name.trim().slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <span className="term-firm-txt">
                            <span className="term-firm-name">{f.name}</span>
                            <span className="term-firm-plan">{fill(d.rankOffers, { n: nf(f.offerCount) })}</span>
                          </span>
                        </span>
                        <span className="term-cnote" data-label={d.previewColNote}>
                          {f.rating != null ? (
                            <NoteRing rating={f.rating} />
                          ) : (
                            <span className="term-tbd">{d.rankNoRating}</span>
                          )}
                        </span>
                        <span className="term-fcountry" data-label={d.colCountry}>
                          {f.country ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                className="term-flag"
                                src={`https://flagcdn.com/w40/${f.country.toLowerCase()}.png`}
                                srcSet={`https://flagcdn.com/w80/${f.country.toLowerCase()}.png 2x`}
                                alt=""
                                width={30}
                                height={20}
                                loading="lazy"
                              />
                              <span className="term-cc-code">{f.country.toUpperCase()}</span>
                            </>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>
                        <span className="tnum term-fyear" data-label={d.colSince}>
                          {f.foundedYear ?? <span className="term-muted">—</span>}
                        </span>
                        <span className="term-plats" data-label={d.colPlatforms}>
                          {f.platforms.length ? (
                            <>
                              {f.platforms.map((p) => {
                                const pl = platformLogo(p);
                                return (
                                  <span key={p} className="term-plat" title={p}>
                                    {pl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={pl.url} alt={p} />
                                    ) : (
                                      <span className="term-plat-txt">{p.slice(0, 2)}</span>
                                    )}
                                  </span>
                                );
                              })}
                              {f.platformTotal > f.platforms.length ? (
                                <span className="term-plat-more">+{nf(f.platformTotal - f.platforms.length)}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>
                        <span className="term-falloc" data-label={d.colAlloc}>
                          <span className="tnum term-falloc-val">{compactMoney(f.maxAlloc, f.currency)}</span>
                          <span
                            className="term-falloc-bar"
                            style={{ '--v': `${Math.round(Math.sqrt(f.maxAlloc / firmAllocMax) * 100)}%` } as React.CSSProperties}
                            aria-hidden="true"
                          />
                        </span>
                        <span className="term-fpromo" data-label={d.previewColPromo}>
                          {f.promo ? (
                            <span className="promo-coupon">
                              <span className="pc-left">
                                <span className="pc-off">{f.promo.discountPct != null ? nf(f.promo.discountPct) : ''}%<b>OFF</b></span>
                                <span className="pc-sub">{f.promo.exclusive ? d.promoExclusive : d.promoGeneric}</span>
                              </span>
                              <span className="pc-right">
                                <span className="pc-firm">{f.name}</span>
                                <CopyCode code={f.promo.code} label={d.copyCode} />
                              </span>
                            </span>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>
                        <span className="term-buy" aria-hidden="true">{d.termRowCta}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─────────── VUE CHALLENGES (offres avec règles) ─────────── */}
            <div className="term-view" data-view="challenges">
              <p className="term-view-sub">{d.challengesViewSub}</p>
              {rows.length === 0 ? (
                <p className="term-empty">{d.previewEmpty}</p>
              ) : (
                <>
                  <p className="term-scrollhint" aria-hidden="true">{d.termScrollHint}</p>
                  <div className="term-scroll">
                    <div className="term-grid">
                  <div className="term-row term-hrow" aria-hidden="true">
                    <span className="term-c-rank">{d.colRank}</span>
                    <span>{d.previewColFirm}</span>
                    <span>{d.previewColNote}</span>
                    <span className="term-c-num">{d.previewColSize}</span>
                    <span className="term-c-num">{d.termColContracts}</span>
                    <span className="term-c-num">{d.previewColPrice}</span>
                    <span className="term-c-num">{d.termColTarget}</span>
                    <span>{d.previewColDrawdown}</span>
                    <span className="term-c-num">{d.termColDaily}</span>
                    <span className="term-c-num">{d.termColPtdd}</span>
                    <span className="term-c-num">{d.termColMinDays}</span>
                    <span>{d.termColFunded}</span>
                    <span className="term-c-num">{d.termColConsistency}</span>
                    <span className="term-c-num">{d.termColSplit}</span>
                    <span />
                  </div>

                  {rows.map((r, idx) => {
                    const logo = firmLogo(r.firmSlug);
                    return (
                      <Link
                        key={r.id}
                        href={comparatorHref(l)}
                        className={`term-row term-drow${idx === 0 ? ' is-top' : ''}`}
                        aria-label={`${r.firmName} ${r.planName}, ${d.previewColNote} ${r.rating ?? d.rankNoRating}, ${compactMoney(r.size, r.currency)}, ${r.totalPrice != null ? money(r.totalPrice, r.currency) : '—'} · ${d.termRowAction}`}
                        style={{ '--i': idx } as React.CSSProperties}
                      >
                        <span className="term-c-rank tnum" data-label={d.colRank}>
                          {idx + 1}
                        </span>

                        <span className="term-firm" data-label={d.previewColFirm}>
                          <span className={`term-logo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                            ) : (
                              r.firmName.trim().slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <span className="term-firm-txt">
                            <span className="term-firm-name">{r.firmName}</span>
                            <span className="term-firm-plan">{r.planName}</span>
                          </span>
                        </span>

                        <span className="term-cnote" data-label={d.previewColNote}>
                          {r.rating != null ? (
                            <NoteRing rating={r.rating} />
                          ) : (
                            <span className="term-tbd">{d.rankNoRating}</span>
                          )}
                        </span>

                        <span className="term-c-num tnum" data-label={d.previewColSize}>
                          {compactMoney(r.size, r.currency)}
                        </span>

                        <span
                          className="term-c-num term-contracts"
                          data-label={d.termColContracts}
                          title={r.minis != null || r.micros != null ? `${r.minis ?? '—'} minis · ${r.micros ?? '—'} micros` : undefined}
                        >
                          {r.minis != null || r.micros != null ? (
                            <>
                              <span className="tnum">{r.minis != null ? nf(r.minis) : '—'}</span>
                              <span className="term-contracts-sep">|</span>
                              <span className="tnum">{r.micros != null ? nf(r.micros) : '—'}</span>
                            </>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>

                        <span className="term-c-num term-price" data-label={d.previewColPrice}>
                          {r.totalPrice != null ? (
                            <span className="term-price-stack">
                              <span className="term-price-main">
                                {r.priceIsFloor ? <span className="term-price-floor">{d.termFloor} </span> : null}
                                <span className="tnum">{money(r.totalPrice, r.currency)}</span>
                                {r.priceRegular != null && r.priceRegular > r.totalPrice ? (
                                  <span className="term-price-was tnum">{money(r.priceRegular, r.currency)}</span>
                                ) : null}
                              </span>
                              <span className="term-price-period">
                                {r.isRecurring ? d.pricePeriodMonthly : d.pricePeriodOnce}
                              </span>
                            </span>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>

                        <span className="term-c-num tnum" data-label={d.termColTarget}>
                          {r.profitTarget != null ? compactMoney(r.profitTarget, r.currency) : <span className="term-muted">—</span>}
                        </span>

                        <span className="term-draw" data-label={d.previewColDrawdown}>
                          <span className={`term-badge term-badge--${r.drawTone === 'trail' ? 'warn' : 'flat'}`}>
                            <DrawGlyph type={r.drawType} />
                            {r.drawType}
                          </span>
                          <span className="tnum term-draw-amt">{compactMoney(r.drawAmount, r.currency)}</span>
                        </span>

                        <span className="term-c-num" data-label={d.termColDaily}>
                          {r.dailyLoss != null ? (
                            <span className="tnum">{compactMoney(r.dailyLoss, r.currency)}</span>
                          ) : (
                            <span className="term-ok">{d.termConsistencyNone}</span>
                          )}
                        </span>

                        <span className="term-c-num tnum" data-label={d.termColPtdd}>
                          {r.profitTarget != null && r.profitTarget > 0 ? (
                            `1:${(r.drawAmount / r.profitTarget).toFixed(2)}`
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>

                        <span className="term-c-num tnum" data-label={d.termColMinDays}>
                          {r.minDays != null ? nf(r.minDays) : <span className="term-muted">—</span>}
                        </span>

                        <span className={`term-hard ${toneCell(r.hardTone)}`} data-label={d.termColFunded}>
                          {r.hardTone === 'ok' ? (
                            <span className="term-hard-ok"><DrawGlyph type="STATIC" />{r.hardLabel}</span>
                          ) : (
                            <span className="term-badge term-badge--bad"><DrawGlyph type={r.fundedDrawType} />{r.hardLabel}</span>
                          )}
                        </span>

                        <span className="term-c-num" data-label={d.termColConsistency}>
                          {r.hasConsistency && r.consistencyPct != null ? (
                            <span className="term-warn tnum">{nf(r.consistencyPct)} %</span>
                          ) : (
                            <span className="term-ok">{d.termConsistencyNone}</span>
                          )}
                        </span>

                        <span className="term-c-num term-c-split" data-label={d.termColSplit}>
                          {r.split != null ? (
                            <span className="term-split">
                              <span className="tnum term-split-val">{nf(r.split)} %</span>
                              <span
                                className="term-split-bar"
                                style={{ '--v': `${Math.max(0, Math.min(100, r.split))}%` } as React.CSSProperties}
                                aria-hidden="true"
                              />
                            </span>
                          ) : (
                            <span className="term-muted">—</span>
                          )}
                        </span>

                        <span className="term-buy" aria-hidden="true">{d.termRowCta}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

                  <ul className="term-legend">
                    <li><span className="term-swatch term-swatch--warn" aria-hidden="true" />{d.termLegendTrail}</li>
                    <li><span className="term-swatch term-swatch--bad" aria-hidden="true" />{d.termLegendHardening}</li>
                  </ul>
                </>
              )}
            </div>

            {/* ─────────── VUE CODES PROMO ─────────── */}
            <div className="term-view" data-view="promos">
              <p className="term-view-sub">{d.promosViewSub}</p>
              {promoRows.length === 0 ? (
                <p className="term-empty">{d.promoEmpty}</p>
              ) : (
                <div className="promo-offers">
                  {promoRows.map((f) => {
                    const logo = firmLogo(f.slug);
                    const promo = f.promo;
                    if (!promo) return null;
                    return (
                      <article key={f.slug} className="promo-offer">
                        {/* Foil holographique — la remise */}
                        <span className="po-foil">
                          <span className="po-off">{promo.discountPct != null ? nf(promo.discountPct) : ''}%<b>OFF</b></span>
                          <span className="po-tag">{promo.exclusive ? d.promoExclusive : d.promoGeneric}</span>
                        </span>
                        {/* Firm */}
                        <span className="po-firm">
                          <span className={`term-logo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                            ) : (
                              f.name.trim().slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <span className="po-firm-txt">
                            <span className="po-firm-name">{f.name}</span>
                            <span className="po-firm-meta">
                              {f.rating != null ? <NoteRing rating={f.rating} size={40} /> : null}
                              {f.entryPrice != null ? <span className="po-price tnum">{d.termFloor} {money(f.entryPrice, f.currency)}</span> : null}
                            </span>
                          </span>
                        </span>
                        {/* Coupon déchiré — le code */}
                        <span className="po-coupon">
                          <span className="pcc-stub">{d.promoCodeLabel}</span>
                          <span className="pcc-code"><CopyCode code={promo.code} label={d.copyCode} /></span>
                        </span>
                        {/* Bouton vers la firm */}
                        <Link href={comparatorHref(l)} className="po-apply">{d.promoApply}</Link>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="term-section-cta">
            <Link href={comparatorHref(l)} className={buttonClasses({ size: 'lg' })}>
              {d.previewCta}
            </Link>
          </div>
        </section>

        {/* ══════════ COMMENT ÇA MARCHE (la boucle produit, §1) ══════════ */}
        <section id="comment" className="term-section">
          <h2 className="term-h2 term-h2--center">{d.howTitle}</h2>
          <p className="term-h2-sub term-h2-sub--center">{d.howSub}</p>
          {/* Les 3 étapes en gros chiffres dégradé (façon stats Stripe) en haut ; la vague
              de lignes parallèles pleine largeur coule juste dessous et remonte derrière
              le bas des étapes (masque haut) → jonction sans couture, ça s'emboîte. */}
          <div className="hiw">
            <div className="hiw-stats">
              {([[d.howStep1T, d.howStep1B], [d.howStep2T, d.howStep2B], [d.howStep3T, d.howStep3B]] as const).map(([t, b], i) => (
                <div key={i} className="hiw-stat">
                  <span className="hiw-stat-num" aria-hidden="true">0{i + 1}</span>
                  <div className="hiw-stat-fore">
                    <span className="hiw-stat-t">{t}</span>
                    <span className="hiw-stat-b">{b}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hiw-wave" aria-hidden="true">
              <svg className="hiw-wave-svg" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="hiwWave" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8f6cff" />
                    <stop offset="48%" stopColor="#c04bff" />
                    <stop offset="100%" stopColor="#ff5cc0" />
                  </linearGradient>
                </defs>
                <g className="hiw-wave-g" stroke="url(#hiwWave)" fill="none" strokeWidth="1">
                  {HOW_WAVE.map((p, i) => (
                    <path key={i} d={p.d} style={{ opacity: p.o }} />
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FAQ ═══════════════════════ */}
        <section id="faq" className="term-section">
          <h2 className="term-h2 term-h2--center">{d.faqTitle}</h2>
          <div className="term-faq">
            {faq.map((f) => (
              <details key={f.q} className="term-faq-item">
                <summary className="term-faq-q">{f.q}</summary>
                <p className="term-faq-a">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="term-section-cta">
            <Link href={`/${l}/help`} className={buttonClasses({ size: 'lg' })}>
              {d.faqHelpCta}
            </Link>
          </div>
        </section>

        {/* ══════════ ALERTES EMAIL (règles · promos · digest — §1/§7/§10) ══════════ */}
        <section id="alertes" className="term-section">
          <div className="alerts">
            <div className="alerts-glow" aria-hidden="true">
              <span className="alerts-blob alerts-blob--1" />
              <span className="alerts-blob alerts-blob--2" />
              <span className="alerts-blob alerts-blob--3" />
            </div>
            <span className="alerts-eyebrow">{d.alertsEyebrow}</span>
            <h2 className="alerts-title">{d.alertsTitle}</h2>
            <p className="alerts-sub">{d.alertsSub}</p>
            <EmailCapture locale={l} />
          </div>
        </section>

        <SiteFooter locale={l} generatedAt={generatedAt} />
      </main>
    </>
  );
}
