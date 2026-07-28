'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterOffers,
  hiddenByUnknownPrice,
  sortOffers,
  buildFacets,
  buildCompareRows,
  toggleCompare,
  presetByKey,
  PRESETS,
  COMPARE_MIN,
  COMPARE_MAX,
  type CompareCell,
  type CompareRow,
  type CompareRowKey,
  type OfferFilters,
  type PublicOffer,
  type RuleStance,
  type SortKey,
} from '@/lib/catalog/public-offer';
import type { ComparatorDict, Locale } from '@/lib/i18n/comparator';
import OfferRow from './OfferRow';
import SideFirms from './SideFirms';

/**
 * Comparateur — deux jeux de colonnes commutables (évaluation / compte financé)
 * et comparaison de 2 à 4 offres.
 *
 * L'état vit ici et se synchronise dans l'URL par `replaceState` : pas de
 * `useSearchParams`, donc la page reste statique (ISR) tout en restant
 * partageable. L'état initial est relu depuis `location.search` au montage.
 *
 * Choix structurant : les deux phases sont deux JEUX DE COLONNES, pas une
 * colonne « cohérence » unique qui vaudrait tantôt pour l'évaluation, tantôt
 * pour le retrait. Un trader qui lit « 30 % » doit savoir de quelle phase on
 * parle — c'est la confusion la plus coûteuse du marché.
 */

type Tab = 'eval' | 'funded';

/** Format court d'une taille de compte : 25000 → « 25k » (boutons filtres compacts). */
const shortSize = (n: number): string => (n >= 1000 ? `${n / 1000}k` : String(n));

const KIND_LABELS = (d: ComparatorDict): Record<string, string> => ({
  evaluation: d.kindEvaluation,
  direct: d.kindDirect,
});

const NEWS_LABELS = (d: ComparatorDict): Record<RuleStance, string> => ({
  allowed: d.newsAllowed,
  restricted: d.newsRestricted,
  forbidden: d.newsForbidden,
  monitored: d.newsMonitored,
});

/** Le tri utile n'est pas le même selon la phase lue. */
const SORT_OPTIONS = (d: ComparatorDict, tab: Tab) => [
  { value: 'health', label: d.sortHealth },
  { value: 'total_price', label: d.sortTotalPrice },
  { value: 'size', label: d.sortSize },
  ...(tab === 'funded' ? [{ value: 'split', label: d.sortSplit }] : []),
  { value: 'rating', label: d.sortRating },
];

/**
 * Libellés des lignes de comparaison. Typé sur `CompareRowKey` : ajouter une
 * ligne au module pur sans la traduire ici **casse le build**.
 */
const ROW_LABEL: Record<CompareRowKey, keyof ComparatorDict> = {
  totalPrice: 'rTotalPrice',
  price: 'rPrice',
  activation: 'rActivation',
  promo: 'rPromo',
  drawdown: 'rDrawdown',
  lock: 'rLock',
  dailyLoss: 'rDailyLoss',
  target: 'rTarget',
  consistency: 'rConsistency',
  minDays: 'rMinDays',
  hardening: 'rHardening',
  fundedDrawdown: 'rFundedDrawdown',
  fundedDailyLoss: 'rFundedDailyLoss',
  fundedConsistency: 'rFundedConsistency',
  split: 'rSplit',
  firstCap: 'rFirstCap',
  frequency: 'rFrequency',
  minProfitDays: 'rMinProfitDays',
  buffer: 'rBuffer',
  method: 'rMethod',
  news: 'rNews',
  health: 'rHealth',
  rating: 'rRating',
  reviewed: 'rReviewed',
};

const PHASE_LABEL = (d: ComparatorDict): Record<CompareRow['phase'], string> => ({
  price: d.phasePrice,
  eval: d.phaseEval,
  funded: d.phaseFunded,
  trust: d.phaseTrust,
});

/**
 * Formateurs liés à la LANGUE DE LA PAGE. Codés en dur en `fr-FR`, un montant
 * s'affichait « 1 000 » sur la page anglaise là où un lecteur attend « 1,000 ».
 */
function makeFormat(locale: Locale) {
  const tag = locale === 'fr' ? 'fr-FR' : 'en-US';
  return {
    compact: (v: number) => v.toLocaleString(tag),
    // Symbole $ DEVANT le montant, format court (« $100 »). Les devises hors USD
    // gardent leur code après le montant.
    money: (v: number, currency: string) => {
      const n = v.toLocaleString(tag, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return currency === 'USD' ? `$${n}` : `${n} ${currency}`;
    },
  };
}

/* --------------------------------------------------- état ⇄ URL (statique) */

interface UiState {
  filters: OfferFilters;
  sort: SortKey;
  preset: string | null;
  tab: Tab;
}

function readUrl(): UiState {
  const empty: UiState = { filters: {}, sort: 'health', preset: null, tab: 'eval' };
  if (typeof window === 'undefined') return empty;
  const q = new URLSearchParams(window.location.search);
  const tab: Tab = q.get('tab') === 'funded' ? 'funded' : 'eval';

  const preset = q.get('p');
  if (preset) {
    const p = presetByKey(preset);
    if (p) return { filters: { ...p.filters }, sort: p.sort, preset, tab };
  }

  const list = (k: string) => q.get(k)?.split(',').filter(Boolean);
  const num = (k: string) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const filters: OfferFilters = {};
  const sizes = list('size')?.map(Number).filter(Number.isFinite);
  if (sizes?.length) filters.sizes = sizes;
  const dd = list('dd') as OfferFilters['drawdownTypes'];
  if (dd?.length) filters.drawdownTypes = dd;
  const fdd = list('fdd') as OfferFilters['fundedDrawdownTypes'];
  if (fdd?.length) filters.fundedDrawdownTypes = fdd;
  const kinds = list('kind');
  if (kinds?.length) filters.kinds = kinds;
  const firms = list('firm');
  if (firms?.length) filters.firms = firms;
  const plats = list('plat');
  if (plats?.length) filters.platforms = plats;
  // `max` accepte 0 (offres gratuites uniquement) ; split/freq restent > 0.
  const maxRaw = q.get('max');
  if (maxRaw !== null) {
    const mv = Number(maxRaw);
    if (Number.isFinite(mv) && mv >= 0) filters.maxTotalPrice = mv;
  }
  filters.minProfitSplit = num('split');
  filters.maxPayoutFrequencyDays = num('freq');
  if (q.get('nocons') === '1') filters.noConsistency = true;
  if (q.get('verified') === '1') filters.verifiedOnly = true;
  if (q.get('nohard') === '1') filters.noFundedHardening = true;
  if (q.get('nofcons') === '1') filters.noFundedConsistency = true;
  if (q.get('news') === '1') filters.newsAllowed = true;

  const s = q.get('sort');
  let sort: SortKey =
    s === 'total_price' || s === 'size' || s === 'rating' || s === 'split' ? s : 'health';
  // `split` n'existe pas en Éval (colonne financée) : jamais de tri fantôme sans
  // pastille active pour le défaire.
  if (tab === 'eval' && sort === 'split') sort = 'health';
  return { filters, sort, preset: null, tab };
}

function writeUrl({ filters, sort, preset, tab }: UiState) {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams();
  if (tab === 'funded') q.set('tab', 'funded');
  if (preset) q.set('p', preset);
  else {
    if (filters.sizes?.length) q.set('size', filters.sizes.join(','));
    if (filters.drawdownTypes?.length) q.set('dd', filters.drawdownTypes.join(','));
    if (filters.fundedDrawdownTypes?.length) q.set('fdd', filters.fundedDrawdownTypes.join(','));
    if (filters.kinds?.length) q.set('kind', filters.kinds.join(','));
    if (filters.firms?.length) q.set('firm', filters.firms.join(','));
    if (filters.platforms?.length) q.set('plat', filters.platforms.join(','));
    if (filters.maxTotalPrice != null) q.set('max', String(filters.maxTotalPrice));
    if (filters.minProfitSplit != null) q.set('split', String(filters.minProfitSplit));
    if (filters.maxPayoutFrequencyDays != null) q.set('freq', String(filters.maxPayoutFrequencyDays));
    if (filters.noConsistency) q.set('nocons', '1');
    if (filters.verifiedOnly) q.set('verified', '1');
    if (filters.noFundedHardening) q.set('nohard', '1');
    if (filters.noFundedConsistency) q.set('nofcons', '1');
    if (filters.newsAllowed) q.set('news', '1');
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
  locale,
  generatedAt,
}: {
  offers: PublicOffer[];
  platformNames: Record<string, string>;
  d: ComparatorDict;
  locale: Locale;
  generatedAt: string;
}) {
  const { compact, money } = useMemo(() => makeFormat(locale), [locale]);
  const [filters, setFilters] = useState<OfferFilters>({});
  const [sort, setSort] = useState<SortKey>('health');
  const [preset, setPreset] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('eval');
  /* La sélection de comparaison n'est PAS dans l'URL : c'est une action en
     cours, pas un état de lecture partageable. */
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(true);

  // Hydratation depuis l'URL au montage : garde la page statique et partageable.
  useEffect(() => {
    const s = readUrl();
    setFilters(s.filters);
    setSort(s.sort);
    setPreset(s.preset);
    setTab(s.tab);
  }, []);

  useEffect(() => {
    writeUrl({ filters, sort, preset, tab });
  }, [filters, sort, preset, tab]);

  // La sélection retombée sous le minimum ferme le panneau — sinon re-sélectionner
  // 2 offres le rouvrirait sans que l'utilisateur l'ait demandé.
  useEffect(() => {
    if (selected.length < COMPARE_MIN) setCompareOpen(false);
  }, [selected]);

  const facets = useMemo(() => buildFacets(offers), [offers]);
  const shown = useMemo(
    () => sortOffers(filterOffers(offers, filters), sort),
    [offers, filters, sort],
  );
  const hiddenPrice = useMemo(() => hiddenByUnknownPrice(offers, filters), [offers, filters]);

  const picked = useMemo(
    () => selected.map((id) => offers.find((o) => o.id === id)).filter((o): o is PublicOffer => !!o),
    [selected, offers],
  );
  const compareRows = useMemo(
    () =>
      picked.length >= COMPARE_MIN
        ? buildCompareRows(picked, {
            num: compact,
            money,
            floor: (t) => `${d.priceFrom} ${t}`,
            varies: (t) => `${t}, ${d.capVaries}`,
            stance: (s) => NEWS_LABELS(d)[s],
            permanentPromo: (t) => `${t} · ${d.promoPermanent}`,
            pending: d.notVerified,
            hardened: d.hardened,
          })
        : [],
    [picked, d],
  );

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

  /* Changer d'onglet ne réinitialise PAS les filtres : un trader qui a réduit
     à « 50 k, sans cohérence » veut voir la même sélection sous l'autre angle.
     Seul un tri devenu inapplicable est ramené au défaut. */
  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === 'eval' && sort === 'split') setSort('health');
    // Les filtres PROPRES à une phase n'ont pas de contrôle sur l'autre onglet :
    // les laisser actifs filtrerait en silence, sans pastille pour les défaire
    // (exactement le piège de l'« état actif invisible »). Les filtres transverses
    // — taille, type de compte, firm, plateforme, prix, vérifié, non-durci —
    // restent, fidèles à l'intention de garder la même sélection sous l'autre angle.
    const drop: (keyof OfferFilters)[] =
      next === 'eval'
        ? ['fundedDrawdownTypes', 'minProfitSplit', 'maxPayoutFrequencyDays', 'noFundedConsistency', 'newsAllowed']
        : ['drawdownTypes', 'noConsistency'];
    if (drop.some((k) => filters[k] !== undefined)) {
      setPreset(null);
      setFilters((prev) => {
        const c = { ...prev };
        for (const k of drop) delete c[k];
        return c;
      });
    }
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

  const news = NEWS_LABELS(d);

  return (
    <div className="cmp-app">
      {/* Colonne de filtres — pleine hauteur, collée au bord gauche (col 1). */}
      <aside className="cmp-side" aria-label={d.filters}>
          {/* En-tête filtres + switch Éval / Financé (haut de colonne, image 3). */}
          <div className="cmp-side-head">
            <span className="cmp-side-title">{d.filters}</span>
            <div className="cmp-tabs" role="tablist" aria-label={d.title}>
              {([
                ['eval', d.tabEval],
                ['funded', d.tabFunded],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`cmp-tab${tab === key ? ' is-on' : ''}`}
                  onClick={() => switchTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

      {/* ---------- Presets ---------- */}
      <div className="cmp-presets-group">
        <span className="cmp-side-ct">{d.presets}</span>
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
      </div>

      {/* ---------- Filtres ---------- */}
      <section className="cmp-filters" aria-label={d.filters}>
        <div className="cmp-fgrid">
          {facets.firms.length > 1 ? (
            <SideFirms
              items={facets.firms}
              selected={filters.firms ?? []}
              onToggle={(slug) => toggleIn('firms', slug)}
              label={d.fFirm}
              seeAll={d.fSeeAll}
              seeLess={d.fSeeLess}
            />
          ) : null}

          {facets.platforms.length > 1 ? (
            <SideFirms
              kind="platform"
              items={facets.platforms.map((p) => ({ slug: p, name: platformNames[p] ?? p }))}
              selected={filters.platforms ?? []}
              onToggle={(slug) => toggleIn('platforms', slug)}
              label={d.fPlatform}
              seeAll={d.fSeeAll}
              seeLess={d.fSeeLess}
            />
          ) : null}

          <fieldset className="cmp-fgroup cmp-fgroup--sizes">
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
                  {shortSize(s)}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Le drawdown filtré suit la PHASE LUE. Un seul filtre « drawdown »
              valant tantôt pour l'évaluation tantôt pour le financé serait
              exactement l'amalgame que ce comparateur existe pour défaire. */}
          <fieldset className="cmp-fgroup">
            <legend>{tab === 'eval' ? d.fDrawdown : d.fDrawdownFunded}</legend>
            <div className="cmp-chips">
              {(tab === 'eval' ? facets.drawdownTypes : facets.fundedDrawdownTypes).map((t) => {
                const key = tab === 'eval' ? 'drawdownTypes' : 'fundedDrawdownTypes';
                const on = !!filters[key]?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`cmp-chip cmp-chip-sm${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleIn(key, t)}
                  >
                    {t}
                  </button>
                );
              })}
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
                patch({ maxTotalPrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })
              }
            />
          </fieldset>

          {/* ---- filtres propres à la phase financée ---- */}
          {tab === 'funded' && facets.splitSteps.length ? (
            <fieldset className="cmp-fgroup">
              <legend>{d.fSplit}</legend>
              <div className="cmp-chips">
                <button
                  type="button"
                  className={`cmp-chip cmp-chip-sm${filters.minProfitSplit == null ? ' is-on' : ''}`}
                  aria-pressed={filters.minProfitSplit == null}
                  onClick={() => patch({ minProfitSplit: undefined })}
                >
                  {d.fAnySplit}
                </button>
                {facets.splitSteps.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`cmp-chip cmp-chip-sm${filters.minProfitSplit === s ? ' is-on' : ''}`}
                    aria-pressed={filters.minProfitSplit === s}
                    onClick={() =>
                      patch({ minProfitSplit: filters.minProfitSplit === s ? undefined : s })
                    }
                  >
                    ≥ {s} %
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {tab === 'funded' && facets.frequencies.length > 1 ? (
            <fieldset className="cmp-fgroup">
              <legend>{d.fFrequency}</legend>
              <div className="cmp-chips">
                {facets.frequencies.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`cmp-chip cmp-chip-sm${filters.maxPayoutFrequencyDays === f ? ' is-on' : ''}`}
                    aria-pressed={filters.maxPayoutFrequencyDays === f}
                    onClick={() =>
                      patch({
                        maxPayoutFrequencyDays:
                          filters.maxPayoutFrequencyDays === f ? undefined : f,
                      })
                    }
                  >
                    {f} {d.fDays}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <div className="cmp-toggles">
          {(tab === 'eval'
            ? [
                { k: 'noConsistency' as const, label: d.fNoConsistency },
                { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
                { k: 'noFundedHardening' as const, label: d.fNoHardening },
              ]
            : [
                { k: 'noFundedConsistency' as const, label: d.fNoFundedConsistency },
                { k: 'newsAllowed' as const, label: d.fNewsAllowed },
                { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
                { k: 'noFundedHardening' as const, label: d.fNoHardening },
              ]
          ).map(({ k, label }) => (
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

          {/* Transparence : date de génération des données (honnêteté, §8). */}
          <p className="cmp-side-foot">
            {d.generatedAt} <span className="num">{generatedAt.slice(0, 10)}</span>
          </p>
        </aside>

      {/* Colonne résultats — pleine hauteur (col 2) : barre d'actions figée en
          haut + liste qui défile seule dessous. */}
      <div className="cmp-main">
        <div className="cmp-actionbar">
          <div className="cmp-actionbar-in">
            <p className="cmp-count">
              <span className="cmp-count-lbl">{d.results}</span>
              <strong className="num">{shown.length}</strong>
              <span className="cmp-count-sep"> / </span>
              <span className="num">{offers.length}</span>
            </p>

            <div className="cmp-actionbar-mid">
              <button
                type="button"
                className="cmp-abtn"
                disabled={selected.length < COMPARE_MIN}
                onClick={() => setCompareOpen(true)}
              >
                {d.compareOpen}{selected.length ? ` (${selected.length})` : ''}
              </button>
              <button type="button" className="cmp-abtn cmp-abtn--reset" onClick={reset} disabled={!active}>
                {d.reset}
              </button>
            </div>

            <div className="cmp-sortpills" role="group" aria-label={d.sort}>
              {SORT_OPTIONS(d, tab).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`cmp-sortpill${sort === o.value ? ' is-on' : ''}`}
                  aria-pressed={sort === o.value}
                  onClick={() => { setPreset(null); setSort(o.value as SortKey); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cmp-listscroll">

      {/* Offres masquées faute de prix publié : une information, pas une alerte. */}
      {hiddenPrice > 0 ? (
        <p className="cmp-hidden-note">
          <span className="num">{hiddenPrice}</span>{' '}
          {hiddenPrice > 1 ? d.hiddenNoPricePlural : d.hiddenNoPrice}
        </p>
      ) : null}

      {/* ---------- Tableau ---------- */}
      {shown.length === 0 ? (
        <div className="card cmp-empty">
          <h2 className="cmp-empty-t">{d.emptyTitle}</h2>
          <p className="cmp-empty-b">{d.emptyBody}</p>
        </div>
      ) : (
        <div className="cmp-oscroll">
          <div className={`cmp-otable cmp-otable--${tab}`} role="table" aria-label={d.title}>
            <div className={`cmp-ocols cmp-ocols--${tab}`} role="row" aria-hidden="true">
              <span /><span />
              <span role="columnheader">{d.colFirm}</span>
              <span role="columnheader">{d.colSize}</span>
              {tab === 'eval' ? (
                <>
                  <span role="columnheader">{d.colPrice}</span>
                  <span role="columnheader">{d.colPromo}</span>
                  <span role="columnheader">{d.colActivation}</span>
                  <span role="columnheader">{d.colPlatforms}</span>
                  <span role="columnheader">{d.colDrawdown}</span>
                  <span role="columnheader">{d.colTarget}</span>
                </>
              ) : (
                <>
                  <span role="columnheader">{d.colConsistencyFunded}</span>
                  <span role="columnheader">{d.colDrawdownFunded}</span>
                  <span role="columnheader">{d.colSplit}</span>
                  <span role="columnheader">{d.colCap}</span>
                  <span role="columnheader">{d.colFrequency}</span>
                  <span role="columnheader">{d.colNews}</span>
                </>
              )}
              <span role="columnheader">{d.colRating}</span>
            </div>

            {shown.map((o) => (
              <OfferRow
                key={o.id}
                offer={o}
                tab={tab}
                d={d}
                fmt={{ compact, money }}
                platformNames={platformNames}
                newsLabel={(s) => news[s]}
                selected={selected.includes(o.id)}
                selectDisabled={!selected.includes(o.id) && selected.length >= COMPARE_MAX}
                onToggleSelect={() => setSelected((s) => toggleCompare(s, o.id))}
              />
            ))}
          </div>
          {/* Terminus explicite : sur un écran plein, une liste courte laissait un
              grand vide sombre qui « faisait bug ». Ce repère marque clairement la
              fin de la liste ; l'espace en dessous se lit alors comme du fond. */}
          <p className="cmp-listend">
            {shown.length}{' '}
            {shown.length > 1 ? d.listEndMany : d.listEndOne}
          </p>
        </div>
      )}
        </div>
      </div>

      {/* ---------- Barre de sélection ---------- */}
      {selected.length > 0 ? (
        <div className="cmp-selbar" role="region" aria-label={d.compare}>
          <span className="cmp-selbar-count">
            <strong className="num">{selected.length}</strong> {d.compareCount}
            {selected.length < COMPARE_MIN ? (
              <span className="cmp-selbar-hint"> · {d.compareHint}</span>
            ) : null}
          </span>
          <div className="cmp-selbar-actions">
            <button type="button" className="cmp-chip cmp-chip-sm" onClick={() => setSelected([])}>
              {d.compareClear}
            </button>
            <button
              type="button"
              className="cmp-chip is-on"
              disabled={selected.length < COMPARE_MIN}
              onClick={() => setCompareOpen(true)}
            >
              {d.compareOpen}
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- Comparatif côte à côte ---------- */}
      {compareOpen && compareRows.length > 0 ? (
        <ComparePanel
          rows={compareRows}
          offers={picked}
          d={d}
          compact={compact}
          onlyDiff={onlyDiff}
          setOnlyDiff={setOnlyDiff}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- comparatif */

function ComparePanel({
  rows,
  offers,
  d,
  compact,
  onlyDiff,
  setOnlyDiff,
  onClose,
}: {
  rows: CompareRow[];
  offers: PublicOffer[];
  d: ComparatorDict;
  compact: (v: number) => string;
  onlyDiff: boolean;
  setOnlyDiff: (v: boolean) => void;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const body = bodyRef.current;
    const focusables = () =>
      [...(body?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    // Focus déplacé DANS le dialogue à l'ouverture (sinon il reste sur le bouton
    // derrière le scrim) ; piège à Tab pour ne pas sortir du dialogue au clavier.
    (focusables()[0] ?? body)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.(); // focus rendu au déclencheur à la fermeture
    };
  }, [onClose]);

  const phases = PHASE_LABEL(d);
  /* En « différences seulement », on garde aussi les lignes `alwaysShow` : le
     durcissement (savoir qu'AUCUNE offre ne durcit est une info) et la date de
     vérification (signal de confiance à ne jamais masquer, même identique). */
  const visible = onlyDiff ? rows.filter((r) => r.differs || r.alwaysShow) : rows;

  /* Les lignes sont regroupées par phase pour que « Cohérence (évaluation) » et
     « Cohérence (retrait) » ne se lisent jamais comme une seule règle. */
  const grouped = (['price', 'eval', 'funded', 'trust'] as const)
    .map((p) => ({ phase: p, rows: visible.filter((r) => r.phase === p) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="cmp-modal" role="dialog" aria-modal="true" aria-label={d.compare}>
      <div className="cmp-modal-scrim" onClick={onClose} />
      <div className="cmp-modal-body lg-glass" ref={bodyRef} tabIndex={-1}>
        <header className="cmp-modal-head">
          <h2 className="cmp-modal-t">{d.compare}</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={onlyDiff}
              onChange={(e) => setOnlyDiff(e.target.checked)}
            />
            <span className="check-box">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
            </span>
            {d.compareOnlyDiff}
          </label>
          <button type="button" className="cmp-chip cmp-chip-sm" onClick={onClose}>
            {d.compareClose}
          </button>
        </header>

        <div className="cmp-modal-scroll">
          <div
            className="cmp-cmp"
            style={{ '--n': offers.length } as React.CSSProperties}
          >
            <div className="cmp-cmp-head">
              <span />
              {offers.map((o) => (
                <span key={o.id} className="cmp-cmp-col">
                  <strong>{o.firm.name}</strong>
                  <span className="cmp-cmp-plan">{o.plan.name}</span>
                  <span className="cmp-cmp-size num">{compact(o.size)}</span>
                </span>
              ))}
            </div>

            {grouped.length === 0 ? (
              <p className="cmp-empty-b cmp-cmp-none">{d.compareNothing}</p>
            ) : (
              grouped.map((g) => (
                <section key={g.phase} className="cmp-cmp-group">
                  <h3 className="cmp-cmp-gt">{phases[g.phase]}</h3>
                  {g.rows.map((r) => (
                    <div
                      key={r.key}
                      className={`cmp-cmp-row${r.differs ? ' is-diff' : ''}${r.pivotal ? ' is-pivot' : ''}`}
                    >
                      <span className="cmp-cmp-label">{d[ROW_LABEL[r.key]]}</span>
                      {r.cells.map((c, i) => (
                        <span key={i} className="cmp-cmp-cell">
                          <Cell cell={c} d={d} />
                        </span>
                      ))}
                    </div>
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Une case du comparatif. « Inconnu » et « sans objet » ne se rendent PAS pareil. */
function Cell({ cell, d }: { cell: CompareCell; d: ComparatorDict }) {
  if (cell.kind === 'unknown') {
    return <span className="cmp-unknown" title={d.unknownHint}>{d.unknownValue}</span>;
  }
  if (cell.kind === 'none') return <span className="cmp-dash">{d.notApplicable}</span>;
  const cls =
    cell.tone === 'ok' ? 'cmp-okv' : cell.tone === 'bad' ? 'cmp-badv' : cell.tone === 'warn' ? 'cmp-warnv' : '';
  return <span className={cls}>{cell.text}</span>;
}
