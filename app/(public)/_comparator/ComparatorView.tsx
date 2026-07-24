'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  filterOffers,
  hiddenByUnknownPrice,
  sortOffers,
  buildFacets,
  presetByKey,
  PRESETS,
  valueOf,
  type OfferFilters,
  type PublicOffer,
  type SortKey,
} from '@/lib/catalog/public-offer';
import type { ComparatorDict } from '@/lib/i18n/comparator';
import Badge from '@/components/ui/Badge';

/**
 * Comparateur — onglet Évaluation.
 *
 * L'état des filtres vit ici et se synchronise dans l'URL par `replaceState` :
 * pas de `useSearchParams`, donc la page reste statique (ISR) tout en restant
 * partageable. L'état initial est relu depuis `location.search` au montage.
 */

const KIND_LABELS = (d: ComparatorDict): Record<string, string> => ({
  evaluation: d.kindEvaluation,
  direct: d.kindDirect,
});

function money(v: number, currency: string): string {
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}
const compact = (v: number) => v.toLocaleString('fr-FR');

/* --------------------------------------------------- état ⇄ URL (statique) */

function readUrl(): { filters: OfferFilters; sort: SortKey; preset: string | null } {
  const empty = { filters: {} as OfferFilters, sort: 'health' as SortKey, preset: null };
  if (typeof window === 'undefined') return empty;
  const q = new URLSearchParams(window.location.search);

  const preset = q.get('p');
  if (preset) {
    const p = presetByKey(preset);
    if (p) return { filters: { ...p.filters }, sort: p.sort, preset };
  }

  const list = (k: string) => q.get(k)?.split(',').filter(Boolean);
  const filters: OfferFilters = {};
  const sizes = list('size')?.map(Number).filter(Number.isFinite);
  if (sizes?.length) filters.sizes = sizes;
  const dd = list('dd') as OfferFilters['drawdownTypes'];
  if (dd?.length) filters.drawdownTypes = dd;
  const kinds = list('kind');
  if (kinds?.length) filters.kinds = kinds;
  const firms = list('firm');
  if (firms?.length) filters.firms = firms;
  const max = Number(q.get('max'));
  if (Number.isFinite(max) && max > 0) filters.maxTotalPrice = max;
  if (q.get('nocons') === '1') filters.noConsistency = true;
  if (q.get('verified') === '1') filters.verifiedOnly = true;
  if (q.get('nohard') === '1') filters.noFundedHardening = true;

  const s = q.get('sort');
  const sort: SortKey =
    s === 'total_price' || s === 'size' || s === 'rating' ? s : 'health';
  return { filters, sort, preset: null };
}

function writeUrl(filters: OfferFilters, sort: SortKey, preset: string | null) {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams();
  if (preset) q.set('p', preset);
  else {
    if (filters.sizes?.length) q.set('size', filters.sizes.join(','));
    if (filters.drawdownTypes?.length) q.set('dd', filters.drawdownTypes.join(','));
    if (filters.kinds?.length) q.set('kind', filters.kinds.join(','));
    if (filters.firms?.length) q.set('firm', filters.firms.join(','));
    if (filters.maxTotalPrice != null) q.set('max', String(filters.maxTotalPrice));
    if (filters.noConsistency) q.set('nocons', '1');
    if (filters.verifiedOnly) q.set('verified', '1');
    if (filters.noFundedHardening) q.set('nohard', '1');
  }
  if (sort !== 'health') q.set('sort', sort);
  const s = q.toString();
  window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
}

/* ---------------------------------------------------------------- composant */

export default function ComparatorView({
  offers,
  platformNames,
  d,
}: {
  offers: PublicOffer[];
  platformNames: Record<string, string>;
  d: ComparatorDict;
}) {
  const [filters, setFilters] = useState<OfferFilters>({});
  const [sort, setSort] = useState<SortKey>('health');
  const [preset, setPreset] = useState<string | null>(null);

  // Hydratation depuis l'URL au montage : garde la page statique et partageable.
  useEffect(() => {
    const s = readUrl();
    setFilters(s.filters);
    setSort(s.sort);
    setPreset(s.preset);
  }, []);

  useEffect(() => {
    writeUrl(filters, sort, preset);
  }, [filters, sort, preset]);

  const facets = useMemo(() => buildFacets(offers), [offers]);
  const shown = useMemo(() => sortOffers(filterOffers(offers, filters), sort), [offers, filters, sort]);
  const hiddenPrice = useMemo(() => hiddenByUnknownPrice(offers, filters), [offers, filters]);

  /** Toute modification manuelle sort du preset : l'un ou l'autre, jamais les deux. */
  const patch = (f: Partial<OfferFilters>) => {
    setPreset(null);
    setFilters((prev) => ({ ...prev, ...f }));
  };
  const toggleIn = <T,>(key: keyof OfferFilters, value: T) => {
    setPreset(null);
    setFilters((prev) => {
      const cur = (prev[key] as T[] | undefined) ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [key]: next.length ? next : undefined };
    });
  };
  const applyPreset = (key: string) => {
    if (preset === key) return reset();
    const p = presetByKey(key);
    if (!p) return;
    setPreset(key);
    setFilters({ ...p.filters });
    setSort(p.sort);
  };
  const reset = () => {
    setPreset(null);
    setFilters({});
    setSort('health');
  };

  const active =
    preset !== null ||
    sort !== 'health' ||
    Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v != null));

  if (offers.length === 0) {
    return (
      <div className="card cmp-empty">
        <h2 className="cmp-empty-t">{d.noneTitle}</h2>
        <p className="cmp-empty-b">{d.noneBody}</p>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Presets ---------- */}
      <section className="cmp-presets" aria-label={d.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`cmp-chip${preset === p.key ? ' is-on' : ''}`}
            aria-pressed={preset === p.key}
            onClick={() => applyPreset(p.key)}
          >
            {d[`preset_${p.key}` as keyof ComparatorDict] as string}
          </button>
        ))}
      </section>

      {/* ---------- Filtres ---------- */}
      <section className="card cmp-filters" aria-label={d.filters}>
        <div className="cmp-fgrid">
          {facets.firms.length > 1 ? (
            <fieldset className="cmp-fgroup">
              <legend>{d.fFirm}</legend>
              <div className="cmp-chips">
                {facets.firms.map((f) => (
                  <button
                    key={f.slug}
                    type="button"
                    className={`cmp-chip cmp-chip-sm${filters.firms?.includes(f.slug) ? ' is-on' : ''}`}
                    aria-pressed={!!filters.firms?.includes(f.slug)}
                    onClick={() => toggleIn('firms', f.slug)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="cmp-fgroup">
            <legend>{d.fSize}</legend>
            <div className="cmp-chips">
              {facets.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`cmp-chip cmp-chip-sm${filters.sizes?.includes(s) ? ' is-on' : ''}`}
                  aria-pressed={!!filters.sizes?.includes(s)}
                  onClick={() => toggleIn('sizes', s)}
                >
                  {compact(s)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="cmp-fgroup">
            <legend>{d.fDrawdown}</legend>
            <div className="cmp-chips">
              {facets.drawdownTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`cmp-chip cmp-chip-sm${filters.drawdownTypes?.includes(t) ? ' is-on' : ''}`}
                  aria-pressed={!!filters.drawdownTypes?.includes(t)}
                  onClick={() => toggleIn('drawdownTypes', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          {facets.kinds.length > 1 ? (
            <fieldset className="cmp-fgroup">
              <legend>{d.fKind}</legend>
              <div className="cmp-chips">
                {facets.kinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`cmp-chip cmp-chip-sm${filters.kinds?.includes(k) ? ' is-on' : ''}`}
                    aria-pressed={!!filters.kinds?.includes(k)}
                    onClick={() => toggleIn('kinds', k)}
                  >
                    {KIND_LABELS(d)[k] ?? k}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="cmp-fgroup">
            <legend>{d.fMaxPrice}</legend>
            <input
              type="number"
              className="input cmp-price-input"
              min={0}
              step={10}
              placeholder="—"
              value={filters.maxTotalPrice ?? ''}
              onChange={(e) =>
                patch({ maxTotalPrice: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </fieldset>
        </div>

        <div className="cmp-toggles">
          {[
            { k: 'noConsistency' as const, label: d.fNoConsistency },
            { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
            { k: 'noFundedHardening' as const, label: d.fNoHardening },
          ].map(({ k, label }) => (
            <label key={k} className="check">
              <input
                type="checkbox"
                checked={!!filters[k]}
                onChange={(e) => patch({ [k]: e.target.checked || undefined })}
              />
              <span className="check-box">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
              </span>
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* ---------- Barre de résultats ---------- */}
      <div className="cmp-bar">
        <p className="cmp-count">
          <strong className="num">{shown.length}</strong>
          <span className="cmp-count-sep"> {d.of} </span>
          <span className="num">{offers.length}</span> {d.results}
          {hiddenPrice > 0 ? (
            <span className="cmp-hidden">
              {' · '}
              <span className="num">{hiddenPrice}</span>{' '}
              {hiddenPrice > 1 ? d.hiddenNoPricePlural : d.hiddenNoPrice}
            </span>
          ) : null}
        </p>

        <div className="cmp-bar-right">
          <label className="cmp-sort">
            <span>{d.sort}</span>
            <select
              className="cmp-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="health">{d.sortHealth}</option>
              <option value="total_price">{d.sortTotalPrice}</option>
              <option value="size">{d.sortSize}</option>
              <option value="rating">{d.sortRating}</option>
            </select>
          </label>
          {active ? (
            <button type="button" className="cmp-chip cmp-chip-sm" onClick={reset}>
              {d.reset}
            </button>
          ) : null}
        </div>
      </div>

      {/* ---------- Tableau ---------- */}
      {shown.length === 0 ? (
        <div className="card cmp-empty">
          <h2 className="cmp-empty-t">{d.emptyTitle}</h2>
          <p className="cmp-empty-b">{d.emptyBody}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <div className="data-list cmp-list" role="table" aria-label={d.title}>
            <div className="data-head" role="row">
              <span role="columnheader">{d.colFirm}</span>
              <span role="columnheader">{d.colPlan}</span>
              <span role="columnheader">{d.colSize}</span>
              <span role="columnheader">{d.colPrice}</span>
              <span role="columnheader">{d.colPromo}</span>
              <span role="columnheader">{d.colActivation}</span>
              <span role="columnheader">{d.colPlatforms}</span>
              <span role="columnheader">{d.colDrawdown}</span>
              <span role="columnheader">{d.colTarget}</span>
              <span role="columnheader">{d.colRating}</span>
              <span role="columnheader">{d.colReviewed}</span>
            </div>

            {shown.map((o) => (
              <div key={o.id} className="data-row" role="row">
                {/* Prop firm */}
                <span role="cell" data-label={d.colFirm} className="cmp-firm">
                  <span className="cmp-firm-name">{o.firm.name}</span>
                  {o.firm.healthScore != null ? (
                    <span className="cmp-health" title={d.healthScore}>
                      <span className="num">{o.firm.healthScore}</span>
                    </span>
                  ) : null}
                </span>

                {/* Compte */}
                <span role="cell" data-label={d.colPlan}>{o.plan.name}</span>

                {/* Taille */}
                <span role="cell" data-label={d.colSize} className="num">{compact(o.size)}</span>

                {/* Prix TTC — inconnu affiché comme inconnu */}
                <span role="cell" data-label={d.colPrice}>
                  {o.totalPrice.known ? (
                    <>
                      <span className="cmp-price num">{money(o.totalPrice.value, o.currency)}</span>
                      <span className="cmp-price-sub">
                        {o.isRecurring ? d.perMonth : d.oneTime}
                      </span>
                    </>
                  ) : (
                    <span className="cmp-unknown" title={d.priceUnknownHint}>{d.priceUnknown}</span>
                  )}
                </span>

                {/* Code promo — permanent signalé */}
                <span role="cell" data-label={d.colPromo}>
                  {o.trust.promo ? (
                    <span className="cmp-promo">
                      <code className="cmp-code">{o.trust.promo.code}</code>
                      {o.trust.promo.discountPct != null ? (
                        <span className="cmp-promo-pct num">−{o.trust.promo.discountPct}%</span>
                      ) : null}
                      {o.trust.promo.permanent ? (
                        <Badge variant="warn" className="cmp-badge">
                          <span title={d.promoPermanentHint}>{d.promoPermanent}</span>
                        </Badge>
                      ) : (
                        <span className="cmp-promo-until">
                          {d.promoUntil} {o.trust.promo.endsAt?.slice(0, 10)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="cmp-dash">—</span>
                  )}
                </span>

                {/* Activation */}
                <span role="cell" data-label={d.colActivation} className="num">
                  {o.activationFee === 0 ? (
                    <span className="cmp-included">{d.activationIncluded}</span>
                  ) : (
                    money(o.activationFee, o.currency)
                  )}
                </span>

                {/* Plateformes */}
                <span role="cell" data-label={d.colPlatforms} className="cmp-plats">
                  {o.platforms.length
                    ? o.platforms.map((s) => platformNames[s] ?? s).join(' · ')
                    : <span className="cmp-dash">—</span>}
                </span>

                {/* Drawdown — durcissement et verrou signalés */}
                <span role="cell" data-label={d.colDrawdown}>
                  <span className="cmp-dd">
                    <span className="cmp-dd-type">{o.drawdown.type}</span>
                    <span className="num">{compact(o.drawdown.amount)}</span>
                  </span>
                  {!o.drawdown.locksAtBreakeven ? (
                    <span className="cmp-note" title={d.notLockedHint}>{d.notLocked}</span>
                  ) : null}
                  {o.fundedHardening.differs ? (
                    <Badge variant="danger" className="cmp-badge">
                      <span title={d.hardeningHint}>
                        {o.drawdown.type} → {o.fundedHardening.drawdownType ?? o.drawdown.type}
                        {o.fundedHardening.drawdownAmount != null
                          ? ` ${compact(o.fundedHardening.drawdownAmount)}`
                          : ''}
                      </span>
                    </Badge>
                  ) : null}
                </span>

                {/* Objectif */}
                <span role="cell" data-label={d.colTarget} className="num">
                  {o.profitTarget != null ? compact(o.profitTarget) : <span className="cmp-dash">—</span>}
                </span>

                {/* Note */}
                <span role="cell" data-label={d.colRating} className="num">
                  {o.plan.rating != null ? o.plan.rating : <span className="cmp-dash">—</span>}
                </span>

                {/* Vérifié le — ce que le concurrent n'affiche pas */}
                <span role="cell" data-label={d.colReviewed}>
                  {o.trust.verified ? (
                    <span className="cmp-reviewed num">{o.trust.reviewedAt}</span>
                  ) : (
                    <Badge variant="warn" className="cmp-badge">
                      <span title={d.notVerifiedHint}>{d.notVerified}</span>
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
