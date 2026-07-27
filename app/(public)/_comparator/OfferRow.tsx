'use client';

import { useId, useState } from 'react';
import Badge from '@/components/ui/Badge';
import type { ComparatorDict } from '@/lib/i18n/comparator';
import type { PublicOffer, RuleStance } from '@/lib/catalog/public-offer';
import { firmLogoUrl, platformLogoUrl, firmColor } from '@/lib/catalog/logos';

/**
 * Ligne d'offre dépliable — LE composant partagé par les deux onglets (Éval /
 * Financé). Compacte par défaut ; au clic sur le chevron (ou la ligne), elle
 * révèle des sous-cartes en relief (idiome du journal). L'onglet pilote à la
 * fois les cellules compactes ET le contenu du déplié — jamais on ne mélange
 * les deux phases (§11).
 */

type Tab = 'eval' | 'funded';

interface Fmt {
  compact: (v: number) => string;
  money: (v: number, currency: string) => string;
}

/* ------------------------------------------------------------ sous-éléments */

function Logo({ offer }: { offer: PublicOffer }) {
  const [broken, setBroken] = useState(false);
  // Priorité au logo_url en base ; sinon le fichier déposé dans public/brand/.
  const src = offer.firm.logo ?? firmLogoUrl(offer.firm.slug);
  const mono = offer.firm.name.trim().slice(0, 2).toUpperCase();
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cmp-logo cmp-logo--img" src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} />;
  }
  // Fallback : monogramme sur une teinte propre à la firm (jamais violet uniforme).
  return (
    <span className="cmp-logo cmp-logo--mono" style={{ backgroundImage: firmColor(offer.firm.name) }} aria-hidden="true">
      {mono}
    </span>
  );
}

/** Icône de plateforme : vrai logo, ou pastille texte propre en repli. */
function PlatMark({ slug, name, variant }: { slug: string; name: string; variant: 'plat' | 'lic' }) {
  const [broken, setBroken] = useState(false);
  const src = platformLogoUrl(slug);
  const cls = variant === 'lic' ? 'cmp-lic' : 'cmp-plat';
  if (src && !broken) {
    return (
      <span className={cls} title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden="true" onError={() => setBroken(true)} />
      </span>
    );
  }
  return <span className={`${cls} ${cls}--txt`} title={name}>{name.slice(0, 3)}</span>;
}

/* Drapeau pays : SVG pour les cas fréquents, sinon le code pays en pastille. */
function CountryFlag({ code }: { code: string | null }) {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c === 'US' || c === 'USA') {
    return (
      <span className="cmp-flag" title={c}>
        <svg viewBox="0 0 19 10" preserveAspectRatio="none" aria-hidden="true">
          <rect width="19" height="10" fill="#b22234" />
          <g fill="#fff"><rect y="1.15" width="19" height=".77" /><rect y="2.7" width="19" height=".77" /><rect y="4.25" width="19" height=".77" /><rect y="5.8" width="19" height=".77" /><rect y="7.35" width="19" height=".77" /><rect y="8.9" width="19" height=".77" /></g>
          <rect width="8" height="5.4" fill="#3c3b6e" />
        </svg>
      </span>
    );
  }
  if (c === 'GB' || c === 'UK') {
    return (
      <span className="cmp-flag" title={c}>
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true">
          <clipPath id="cf-gb"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
          <g clipPath="url(#cf-gb)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
          </g>
        </svg>
      </span>
    );
  }
  return <span className="cmp-flag cmp-flag--txt num" title={c}>{c}</span>;
}

/* Jauge de note circulaire : lime ≥8, ambre 4-7, rouge ≤3. Jamais l'accent. */
function Gauge({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="cmp-dash">—</span>;
  const tone = rating >= 8 ? 'var(--lime)' : rating >= 4 ? 'var(--amber)' : 'var(--red)';
  const circ = 2 * Math.PI * 15;
  const off = circ * (1 - Math.max(0, Math.min(10, rating)) / 10);
  return (
    <span className="cmp-gauge">
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <circle className="cmp-gauge-track" cx="21" cy="21" r="15" fill="none" strokeWidth="4" />
        <circle cx="21" cy="21" r="15" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 21 21)" />
      </svg>
      <b className="num" style={{ color: tone }}>{rating}</b>
    </span>
  );
}

function PlatformStack({ slugs, names }: { slugs: string[]; names: Record<string, string> }) {
  if (!slugs.length) return <span className="cmp-dash">—</span>;
  return (
    <span className="cmp-plats">
      {slugs.slice(0, 4).map((s) => <PlatMark key={s} slug={s} name={names[s] ?? s} variant="plat" />)}
    </span>
  );
}

const ddClass = (t: string) => (t === 'TRAIL' ? 'cmp-dd-trail' : t === 'STATIC' ? 'cmp-dd-static' : 'cmp-dd-eod');

/* --------------------------------------------------------------- sous-cartes */

interface Card { k: string; el: React.ReactNode; wide?: boolean }

function evalCards(o: PublicOffer, d: ComparatorDict, fmt: Fmt, names: Record<string, string>): Card[] {
  return [
    { k: d.sDailyLoss, el: o.dailyLossLimit != null ? <span className="num">{fmt.money(o.dailyLossLimit, o.currency)}</span> : dash() },
    { k: d.sSizing, el: sizing(o.sizing) },
    { k: d.sConsistency, el: o.hasConsistency ? <span className="cmp-warnv num">{o.consistencyPct} %</span> : <span className="cmp-okv">{d.noConsistencyValue}</span> },
    { k: d.sMinDays, el: <span className="num">{o.minTradingDays}</span> },
    { k: d.sScalping, wide: true, el: scalping(o, d) },
    { k: d.sMaxAccounts, el: o.firm.maxAccounts != null ? <span className="num">{o.firm.maxAccounts}</span> : dash() },
    { k: d.sLicenses, el: licenses(o.licenses, names) },
    { k: d.sReviewed, el: reviewed(o, d) },
  ];
}

function fundedCards(o: PublicOffer, d: ComparatorDict, fmt: Fmt, names: Record<string, string>): Card[] {
  const f = o.funded;
  return [
    { k: d.sDailyLoss, el: f.dailyLossLimit != null ? <span className="num">{fmt.money(f.dailyLossLimit, o.currency)}</span> : dash() },
    { k: d.sSizing, el: sizing(f.sizing) },
    { k: d.sBuffer, el: f.buffer != null ? <span className="num">{fmt.money(f.buffer, o.currency)}</span> : dash() },
    { k: d.sMinProfitDays, el: f.minProfitDays != null ? <span className="num">{f.minProfitDays}</span> : dash() },
    { k: d.sMethod, el: f.method ? <span>{f.method}</span> : dash() },
    { k: d.sScalping, wide: true, el: scalping(o, d) },
    { k: d.sMaxAccounts, el: o.firm.maxAccounts != null ? <span className="num">{o.firm.maxAccounts}</span> : dash() },
    { k: d.sLicenses, el: licenses(o.licenses, names) },
    { k: d.sReviewed, el: reviewed(o, d) },
  ];
}

const dash = () => <span className="cmp-dash">—</span>;
function sizing(s: { minis: number | null; micros: number | null }) {
  const parts: string[] = [];
  if (s.minis != null) parts.push(`${s.minis} mini${s.minis > 1 ? 's' : ''}`);
  if (s.micros != null) parts.push(`${s.micros} micro${s.micros > 1 ? 's' : ''}`);
  return parts.length ? <span className="num">{parts.join(' / ')}</span> : dash();
}
function scalping(o: PublicOffer, d: ComparatorDict) {
  if (!o.scalping) return dash();
  const s = o.scalping.stance;
  const cls = s === 'forbidden' ? 'cmp-badv' : s === 'allowed' ? 'cmp-okv' : 'cmp-warnv';
  const label = s === 'allowed' ? d.scAllowed : s === 'forbidden' ? d.scForbidden : s === 'restricted' ? d.scRestricted : d.scMonitored;
  return (
    <span className="cmp-scalp">
      <span className={cls}>{label}</span>
      {o.scalping.note ? <span className="cmp-scalp-note">{o.scalping.note}</span> : null}
    </span>
  );
}
function licenses(slugs: string[], names: Record<string, string>) {
  if (!slugs.length) return dash();
  return (
    <span className="cmp-lics">
      {slugs.slice(0, 5).map((s) => <PlatMark key={s} slug={s} name={names[s] ?? s} variant="lic" />)}
    </span>
  );
}
function reviewed(o: PublicOffer, d: ComparatorDict) {
  return o.trust.verified
    ? <span className="cmp-okv num">{o.trust.reviewedAt}</span>
    : <Badge variant="warn"><span>{d.notVerified}</span></Badge>;
}

/* ------------------------------------------------------------------- ligne */

export default function OfferRow({
  offer, tab, d, fmt, platformNames, newsLabel, selected, selectDisabled, onToggleSelect,
}: {
  offer: PublicOffer;
  tab: Tab;
  d: ComparatorDict;
  fmt: Fmt;
  platformNames: Record<string, string>;
  newsLabel: (s: RuleStance) => string;
  selected: boolean;
  selectDisabled: boolean;
  onToggleSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const o = offer;
  const cards = tab === 'eval' ? evalCards(o, d, fmt, platformNames) : fundedCards(o, d, fmt, platformNames);

  return (
    <div className={`cmp-orow cmp-orow--${tab}${selected ? ' is-picked' : ''}${open ? ' is-open' : ''}`}>
      <div className="cmp-orow-head" onClick={() => setOpen((v) => !v)}>
        {/* Sélection pour comparaison — n'entraîne jamais le dépliement. */}
        <label className="check cmp-orow-pick" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            disabled={selectDisabled}
            onChange={onToggleSelect}
          />
          <span className="check-box">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
          </span>
          <span className="sr-only">{d.compareSelect} — {o.firm.name} {o.plan.name}</span>
        </label>

        <button
          type="button"
          className="cmp-chev"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={open ? d.collapse : d.expand}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        {/* Prop firm */}
        <span className="cmp-firm">
          <Logo offer={o} />
          <span className="cmp-firm-txt">
            <span className="cmp-firm-name">{o.plan.name}</span>
            <span className="cmp-firm-sub">
              {o.firm.name}
              <CountryFlag code={o.firm.country} />
              {o.firm.foundedYear ? <span className="num">{o.firm.foundedYear}</span> : null}
            </span>
          </span>
        </span>

        {/* Taille */}
        <span className="cmp-size num">{fmt.compact(o.size)}</span>

        {tab === 'eval' ? (
          <>
            <span className="cmp-price">
              {o.totalPrice.known ? (
                <>
                  <b className="num">{o.totalPriceIsFloor ? `${d.priceFrom} ` : ''}{fmt.money(o.totalPrice.value, o.currency)}</b>
                  {o.priceRegular != null ? <s className="num">{fmt.money(o.priceRegular, o.currency)}</s> : null}
                </>
              ) : <span className="cmp-unknown">{d.priceUnknown}</span>}
            </span>
            <span>{o.trust.promo ? <span className="cmp-promo"><code>{o.trust.promo.code}</code>{o.trust.promo.discountPct != null ? <span className="num"> −{o.trust.promo.discountPct}%</span> : null}</span> : dash()}</span>
            <span className={o.activationFee === 0 ? 'cmp-okv' : 'num'}>{o.activationFee === 0 ? d.activationIncluded : fmt.money(o.activationFee, o.currency)}</span>
            <span><PlatformStack slugs={o.platforms} names={platformNames} /></span>
            <span className="cmp-ddcell">
              <span className="cmp-dd"><span className={`cmp-dd-badge ${ddClass(o.drawdown.type)}`}>{o.drawdown.type}</span><span className="num">{fmt.compact(o.drawdown.amount)}</span></span>
              {o.fundedHardening.differs ? <span className="cmp-harden" title={d.hardeningHint}>{o.drawdown.type} → {o.funded.drawdown.type}</span> : <span className="cmp-same" title={d.hardeningHint}>{d.ddUnchanged}</span>}
            </span>
            <span className="num">{o.profitTarget != null ? fmt.compact(o.profitTarget) : <span className="cmp-dash">—</span>}</span>
          </>
        ) : (
          <>
            <span>{o.funded.hasConsistency ? <span className="cmp-warnv num">{o.funded.consistencyPct} %</span> : <span className="cmp-okv">{d.noConsistencyValue}</span>}</span>
            <span className="cmp-ddcell">
              <span className="cmp-dd"><span className={`cmp-dd-badge ${ddClass(o.funded.drawdown.type)}`}>{o.funded.drawdown.type}</span><span className="num">{fmt.compact(o.funded.drawdown.amount)}</span></span>
              {o.fundedHardening.differs ? <span className="cmp-harden" title={d.hardeningHint}>{o.drawdown.type} → {o.funded.drawdown.type}</span> : <span className="cmp-same" title={d.hardeningHint}>{d.ddUnchanged}</span>}
            </span>
            <span className="num">{o.funded.splitTiers.length ? o.funded.splitTiers.map((t) => `${t.splitPct}%`).join(' → ') : o.funded.profitSplit != null ? `${o.funded.profitSplit} %` : <span className="cmp-unknown">{d.unknownValue}</span>}</span>
            <span className="num">{o.funded.firstCap.known ? (o.funded.firstCap.value === null ? <span className="cmp-okv">{d.noCap}</span> : fmt.money(o.funded.firstCap.value, o.currency)) : <span className="cmp-unknown">{d.unknownValue}</span>}</span>
            <span className="num">{o.funded.frequencyDays != null ? `${o.funded.frequencyDays} ${d.fDays}` : <span className="cmp-unknown">{d.unknownValue}</span>}</span>
            <span>{o.funded.news.stance ? <span className={o.funded.news.stance === 'forbidden' ? 'cmp-badv' : o.funded.news.stance === 'allowed' ? 'cmp-okv' : 'cmp-warnv'} title={o.funded.news.note ?? undefined}>{newsLabel(o.funded.news.stance)}</span> : <span className="cmp-unknown">{d.unknownValue}</span>}</span>
          </>
        )}

        {/* Note */}
        <span className="cmp-notecell"><Gauge rating={o.plan.rating} /></span>
      </div>

      {/* Panneau déplié — sous-cartes en relief. */}
      <div className="cmp-orow-detail" id={detailId} role="region" aria-label={o.firm.name}>
        <div className="cmp-orow-detail-in">
          <div className="cmp-subgrid">
            {cards.map((c) => (
              <div key={c.k} className={`cmp-subcard${c.wide ? ' cmp-subcard--wide' : ''}`}>
                <div className="cmp-subk">{c.k}</div>
                <div className="cmp-subv">{c.el}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
