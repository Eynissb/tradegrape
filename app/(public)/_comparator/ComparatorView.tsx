'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterOffers,
  hiddenByUnknownPrice,
  sortOffers,
  buildFacets,
  buildCompareRows,
  buildFirmRows,
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
import { firmLogo, platformLogo } from '@/lib/catalog/logos';
import NoteRing from '@/app/(public)/_home/NoteRing';
import CopyCode from '@/app/(public)/_home/CopyCode';
import OfferRow from './OfferRow';
import SideFirms from './SideFirms';
import FilterMenu from './FilterMenu';
import CheckList from './CheckList';

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

type Tab = 'firm' | 'eval' | 'funded' | 'offers';

/** Remplit un gabarit « {n} offres » — même helper que la home. */
const fillTpl = (tpl: string, map: Record<string, string>): string =>
  Object.entries(map).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);

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
/* Le tri « Fiabilité » (health score) n'a de sens que si la donnée existe. Tant que
   `compute-health-scores` (§10) ne l'alimente pas, la pastille est masquée — comme le
   filtre Health — pour ne pas offrir un tri qui ne trie rien. */
/* Tris RÉELLEMENT utilisés sur les comparateurs de prop firms (réf. Prop Firm Match,
   Prop Firms Compare) : prix (challenge fee), note/avis, et — en financé — le profit
   split. On a retiré « Taille de compte » : ce n'est pas un tri mais un FILTRE (on
   choisit sa taille, on ne classe pas dessus) — d'où l'impression de doublon. */
const SORT_OPTIONS = (d: ComparatorDict, tab: Tab, hasHealth: boolean) => [
  ...(hasHealth ? [{ value: 'health', label: d.sortHealth }] : []),
  { value: 'total_price', label: d.sortTotalPrice },
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
  payoutMin: 'rPayoutMin',
  frequency: 'rFrequency',
  minProfitDays: 'rMinProfitDays',
  buffer: 'rBuffer',
  method: 'rMethod',
  fundedSizing: 'rFundedSizing',
  maxAccounts: 'rMaxAccounts',
  news: 'rNews',
  health: 'rHealth',
  rating: 'rRating',
  reviewed: 'rReviewed',
};


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
    // Montant abrégé (« $150k », « $1.2M ») — pour la colonne allocation de la vue Firm.
    compactMoney: (v: number, currency: string) => {
      const n =
        v >= 1_000_000
          ? `${(v / 1_000_000).toLocaleString(tag, { maximumFractionDigits: 2 })}M`
          : v >= 1000
            ? `${(v / 1000).toLocaleString(tag)}k`
            : `${v}`;
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
  const rawTab = q.get('tab');
  const tab: Tab =
    rawTab === 'funded' ? 'funded' : rawTab === 'firm' ? 'firm' : rawTab === 'offers' ? 'offers' : 'eval';

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
  filters.minHealthScore = num('health');
  filters.minRating = num('rating');
  // `maxdays` accepte 0 (offres à 0 jour de trading minimum) ; num() écarte 0.
  const maxDaysRaw = q.get('maxdays');
  if (maxDaysRaw !== null) {
    const dv = Number(maxDaysRaw);
    if (Number.isFinite(dv) && dv >= 0) filters.maxMinTradingDays = dv;
  }
  if (q.get('lock') === '1') filters.lockingTrailing = true;
  if (q.get('freeact') === '1') filters.freeActivation = true;
  if (q.get('once') === '1') filters.oneTimePayment = true;
  if (q.get('scalp') === '1') filters.scalpingAllowed = true;
  if (q.get('nodl') === '1') filters.noDailyLoss = true;
  if (q.get('promo') === '1') filters.withPromo = true;
  if (q.get('excl') === '1') filters.exclusivePromo = true;

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
  else if (tab === 'firm') q.set('tab', 'firm');
  else if (tab === 'offers') q.set('tab', 'offers');
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
    if (filters.minHealthScore != null) q.set('health', String(filters.minHealthScore));
    if (filters.minRating != null) q.set('rating', String(filters.minRating));
    if (filters.maxMinTradingDays != null) q.set('maxdays', String(filters.maxMinTradingDays));
    if (filters.lockingTrailing) q.set('lock', '1');
    if (filters.freeActivation) q.set('freeact', '1');
    if (filters.oneTimePayment) q.set('once', '1');
    if (filters.scalpingAllowed) q.set('scalp', '1');
    if (filters.noDailyLoss) q.set('nodl', '1');
    if (filters.withPromo) q.set('promo', '1');
    if (filters.exclusivePromo) q.set('excl', '1');
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
  const { compact, money, compactMoney } = useMemo(() => makeFormat(locale), [locale]);
  const [filters, setFilters] = useState<OfferFilters>({});
  const [sort, setSort] = useState<SortKey>('health');
  const [preset, setPreset] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('eval');
  /* La sélection de comparaison n'est PAS dans l'URL : c'est une action en
     cours, pas un état de lecture partageable. */
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  // Par défaut on montre TOUT (vue complète, plus intuitive) ; le toggle « Ne
  // montrer que les différences » sert à se concentrer sur ce qui diverge.
  const [onlyDiff, setOnlyDiff] = useState(false);

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
  const hasHealth = facets.healthSteps.length > 0;
  // Si le tri Fiabilité est indisponible (pas de donnée), on retombe sur le prix —
  // pour le tri RÉEL comme pour la pastille active (jamais de tri fantôme).
  const sortEff: SortKey = sort === 'health' && !hasHealth ? 'total_price' : sort;
  const shown = useMemo(
    () => sortOffers(filterOffers(offers, filters), sortEff),
    [offers, filters, sortEff],
  );
  const hiddenPrice = useMemo(() => hiddenByUnknownPrice(offers, filters), [offers, filters]);

  /* Vue « Firm » : un agrégat par prop firm sur les offres DÉJÀ filtrées (les
     filtres s'appliquent donc aussi ici). Même fonction pure que la home. */
  const firmRows = useMemo(() => buildFirmRows(shown), [shown]);
  const firmAllocMax = Math.max(1, ...firmRows.map((f) => f.maxAlloc || 0));
  // Vue « Offres » : cartes des firms qui ont une promo (design repris de la home).
  const promoRows = useMemo(() => firmRows.filter((f) => f.promo), [firmRows]);
  // Totaux NON filtrés, pour le dénominateur du compteur selon la vue.
  const allFirms = useMemo(() => buildFirmRows(offers), [offers]);
  const allPromos = useMemo(() => allFirms.filter((f) => f.promo), [allFirms]);

  /* Compteur contextuel : le nombre ET le nom changent selon la vue — firms,
     comptes (Challenge/Funded) ou promos. « comptes » remplace « offres ». */
  const countShown = tab === 'firm' ? firmRows.length : tab === 'offers' ? promoRows.length : shown.length;
  const countTotal = tab === 'firm' ? allFirms.length : tab === 'offers' ? allPromos.length : offers.length;
  const countNoun = tab === 'firm' ? d.countFirms : tab === 'offers' ? d.countPromos : d.countAccounts;
  // Anneau de progression : part filtrée (affiché / total). r=20 dans un viewBox 48.
  const RING_R = 20;
  const RING_C = 2 * Math.PI * RING_R;
  const ringRatio = countTotal > 0 ? Math.min(1, countShown / countTotal) : 0;
  const ringOffset = RING_C * (1 - ringRatio);

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

  // Options binaires (cases à cocher) — dépendent de la phase lue. Réutilisées
  // pour le badge du menu « Options » et pour son contenu.
  const toggleDefs =
    tab === 'firm' || tab === 'offers'
      ? [
          { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
          { k: 'freeActivation' as const, label: d.fFreeActivation },
          { k: 'oneTimePayment' as const, label: d.fOneTime },
          { k: 'withPromo' as const, label: d.fWithPromo },
          { k: 'exclusivePromo' as const, label: d.fExclusivePromo },
        ]
      : tab === 'eval'
      ? [
          { k: 'noConsistency' as const, label: d.fNoConsistency },
          { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
          { k: 'noFundedHardening' as const, label: d.fNoHardening },
          { k: 'lockingTrailing' as const, label: d.fLockingTrailing },
          { k: 'freeActivation' as const, label: d.fFreeActivation },
          { k: 'oneTimePayment' as const, label: d.fOneTime },
          { k: 'scalpingAllowed' as const, label: d.fScalping },
          { k: 'noDailyLoss' as const, label: d.fNoDailyLoss },
          { k: 'withPromo' as const, label: d.fWithPromo },
          { k: 'exclusivePromo' as const, label: d.fExclusivePromo },
        ]
      : [
          { k: 'noFundedConsistency' as const, label: d.fNoFundedConsistency },
          { k: 'newsAllowed' as const, label: d.fNewsAllowed },
          { k: 'verifiedOnly' as const, label: d.fVerifiedOnly },
          { k: 'noFundedHardening' as const, label: d.fNoHardening },
          { k: 'freeActivation' as const, label: d.fFreeActivation },
          { k: 'oneTimePayment' as const, label: d.fOneTime },
          { k: 'scalpingAllowed' as const, label: d.fScalping },
          { k: 'noDailyLoss' as const, label: d.fNoDailyLoss },
          { k: 'withPromo' as const, label: d.fWithPromo },
          { k: 'exclusivePromo' as const, label: d.fExclusivePromo },
        ];
  const activeToggles = toggleDefs.filter((t) => filters[t.k]).length;
  const drawdownKey = tab === 'eval' ? 'drawdownTypes' : 'fundedDrawdownTypes';
  /* Les vues Firm et Offers sont des AGRÉGATS par firm (cartes), pas des tableaux
     d'offres : les filtres au niveau de l'offre (taille, drawdown, prix, jours,
     type de financement, règles, presets) n'y ont pas de sens. On n'y garde que les
     filtres au niveau FIRM (firms, plateformes, note). Seuls Éval/Financé montrent
     tout le jeu de filtres d'offre. */
  const offerTable = tab === 'eval' || tab === 'funded';

  return (
    <div className="cmp-app">
      {/* Barre de filtres HORIZONTALE (remplace le rail gauche facon concurrent) :
          retour + phase Éval/Financé + un chip-déroulant par groupe de filtres. */}
      <div className="cmp-filterbar">
        <div className="cmp-filterbar-in">
          {/* Rangée 1 : pilule d'onglets SEULE et centrée. */}
          <div className="cmp-fbar-top">
            <div className="cmp-tabs" role="tablist" aria-label={d.title}>
              {([
                ['firm', d.tabFirm],
                ['eval', d.tabEval],
                ['funded', d.tabFunded],
                ['offers', d.tabOffers],
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

          {/* Rangée 2 : compteur (contextuel selon la vue) + chips de filtres, puis
              la zone d'action (tri · Reset) poussée à droite. Tout sur une ligne. */}
          <div className="cmp-fmenus">
            {/* Compteur = anneau de progression : le nombre affiché au centre, la
                part filtrée en dégradé (affiché/total), le nom selon la vue. */}
            <div className="cmp-ring" role="status" aria-label={`${countShown} ${countNoun} ${d.of} ${countTotal}`}>
              <span className="cmp-ring-viz">
                <svg className="cmp-ring-svg" viewBox="0 0 48 48" aria-hidden="true">
                  <defs>
                    <linearGradient id="cmpRingGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--c1)" />
                      <stop offset="100%" stopColor="var(--c2)" />
                    </linearGradient>
                  </defs>
                  <circle className="cmp-ring-track" cx="24" cy="24" r={RING_R} />
                  <circle
                    className="cmp-ring-fill"
                    cx="24"
                    cy="24"
                    r={RING_R}
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <span className="cmp-ring-num num">{countShown}</span>
              </span>
              <span className="cmp-ring-meta">
                <span className="cmp-ring-noun">{countNoun}</span>
                <span className="cmp-ring-total num">{d.of} {countTotal}</span>
              </span>
            </div>

            {offerTable ? (
              <FilterMenu label={d.presets} count={preset ? 1 : 0}>
                <CheckList
                  items={PRESETS.map((p) => ({ value: p.key, label: d[`preset_${p.key}` as keyof ComparatorDict] as string }))}
                  selected={preset ? [preset] : []}
                  onToggle={(v) => applyPreset(v)}
                />
              </FilterMenu>
            ) : null}

            {facets.firms.length > 1 ? (
              <FilterMenu label={d.fFirm} count={filters.firms?.length ?? 0} wide>
                <SideFirms
                  items={facets.firms}
                  selected={filters.firms ?? []}
                  onToggle={(slug) => toggleIn('firms', slug)}
                  label={d.fFirm}
                  seeAll={d.fSeeAll}
                  seeLess={d.fSeeLess}
                />
              </FilterMenu>
            ) : null}

            {tab !== 'offers' && facets.platforms.length > 1 ? (
              <FilterMenu label={d.fPlatform} count={filters.platforms?.length ?? 0} wide>
                <SideFirms
                  kind="platform"
                  items={facets.platforms.map((p) => ({ slug: p, name: platformNames[p] ?? p }))}
                  selected={filters.platforms ?? []}
                  onToggle={(slug) => toggleIn('platforms', slug)}
                  label={d.fPlatform}
                  seeAll={d.fSeeAll}
                  seeLess={d.fSeeLess}
                />
              </FilterMenu>
            ) : null}

            {offerTable ? (
              <FilterMenu label={d.fSize} count={filters.sizes?.length ?? 0}>
                <CheckList
                  items={facets.sizes.map((s) => ({ value: String(s), label: shortSize(s) }))}
                  selected={(filters.sizes ?? []).map(String)}
                  onToggle={(v) => toggleIn('sizes', Number(v))}
                />
              </FilterMenu>
            ) : null}

            {/* Seuils mono-sélection (comme le menu Split) : la sélection est un
                tableau d'un élément dérivé de la valeur unique ; recliquer efface.
                Toujours visibles (fiabilité et note ne dépendent pas de la phase). */}
            {/* Ces menus ne s'affichent que si la donnée existe (pas de menu vide) :
                le health_score n'est pas encore alimenté en base → Health masqué
                tant que la colonne est vide (§10, job compute-health-scores). */}
            {facets.healthSteps.length ? (
              <FilterMenu label={d.fHealth} count={filters.minHealthScore != null ? 1 : 0}>
                <CheckList
                  items={facets.healthSteps.map((s) => ({ value: String(s), label: `≥ ${s}` }))}
                  selected={filters.minHealthScore != null ? [String(filters.minHealthScore)] : []}
                  onToggle={(v) => patch({ minHealthScore: filters.minHealthScore === Number(v) ? undefined : Number(v) })}
                />
              </FilterMenu>
            ) : null}

            {facets.ratingSteps.length ? (
              <FilterMenu label={d.fRating} count={filters.minRating != null ? 1 : 0}>
                <CheckList
                  items={facets.ratingSteps.map((s) => ({ value: String(s), label: `≥ ${s}` }))}
                  selected={filters.minRating != null ? [String(filters.minRating)] : []}
                  onToggle={(v) => patch({ minRating: filters.minRating === Number(v) ? undefined : Number(v) })}
                />
              </FilterMenu>
            ) : null}

            {offerTable && facets.minDaysSteps.length > 1 ? (
              <FilterMenu label={d.fMinDays} count={filters.maxMinTradingDays != null ? 1 : 0}>
                <CheckList
                  items={facets.minDaysSteps.map((s) => ({ value: String(s), label: `≤ ${s} ${d.fDays}` }))}
                  selected={filters.maxMinTradingDays != null ? [String(filters.maxMinTradingDays)] : []}
                  onToggle={(v) => patch({ maxMinTradingDays: filters.maxMinTradingDays === Number(v) ? undefined : Number(v) })}
                />
              </FilterMenu>
            ) : null}

            {/* Le drawdown filtré suit la PHASE LUE (éval vs financé) — jamais un
                filtre unique qui amalgamerait les deux. Sans objet en vue Firm
                (agrégat par firm, pas de phase lue). */}
            {tab !== 'firm' && tab !== 'offers' ? (
              <FilterMenu
                label={tab === 'eval' ? d.fDrawdown : d.fDrawdownFunded}
                count={filters[drawdownKey]?.length ?? 0}
              >
                <CheckList
                  items={(tab === 'eval' ? facets.drawdownTypes : facets.fundedDrawdownTypes).map((t) => ({ value: t, label: t }))}
                  selected={filters[drawdownKey] ?? []}
                  onToggle={(v) => toggleIn(drawdownKey, v)}
                />
              </FilterMenu>
            ) : null}

            {offerTable && facets.kinds.length > 1 ? (
              <FilterMenu label={d.fKind} count={filters.kinds?.length ?? 0}>
                <CheckList
                  items={facets.kinds.map((k) => ({ value: k, label: KIND_LABELS(d)[k] ?? k }))}
                  selected={filters.kinds ?? []}
                  onToggle={(v) => toggleIn('kinds', v)}
                />
              </FilterMenu>
            ) : null}

            {/* Prix TTC max : valeur libre → champ EN LIGNE dans la barre, pas de
                dropdown (on ne coche pas un montant). Offre uniquement. */}
            {offerTable ? (
              <label className={`cmp-price-inline${filters.maxTotalPrice != null ? ' is-on' : ''}`}>
                <span className="cmp-price-inline-lbl">{d.fMaxPrice}</span>
                <input
                  type="number"
                  className="cmp-price-inline-in num"
                  min={0}
                  step={10}
                  placeholder="—"
                  value={filters.maxTotalPrice ?? ''}
                  onChange={(e) =>
                    patch({ maxTotalPrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })
                  }
                />
              </label>
            ) : null}

            {tab === 'funded' && facets.splitSteps.length ? (
              <FilterMenu label={d.fSplit} count={filters.minProfitSplit != null ? 1 : 0}>
                <CheckList
                  items={facets.splitSteps.map((s) => ({ value: String(s), label: `≥ ${s} %` }))}
                  selected={filters.minProfitSplit != null ? [String(filters.minProfitSplit)] : []}
                  onToggle={(v) => patch({ minProfitSplit: filters.minProfitSplit === Number(v) ? undefined : Number(v) })}
                />
              </FilterMenu>
            ) : null}

            {tab === 'funded' && facets.frequencies.length > 1 ? (
              <FilterMenu label={d.fFrequency} count={filters.maxPayoutFrequencyDays != null ? 1 : 0}>
                <CheckList
                  items={facets.frequencies.map((f) => ({ value: String(f), label: `${f} ${d.fDays}` }))}
                  selected={filters.maxPayoutFrequencyDays != null ? [String(filters.maxPayoutFrequencyDays)] : []}
                  onToggle={(v) => patch({ maxPayoutFrequencyDays: filters.maxPayoutFrequencyDays === Number(v) ? undefined : Number(v) })}
                />
              </FilterMenu>
            ) : null}

            {offerTable ? (
              <FilterMenu label={d.fOptions} count={activeToggles} align="end">
                <div className="cmp-toggles">
                  {toggleDefs.map(({ k, label }) => (
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
              </FilterMenu>
            ) : null}

            {/* Zone d'action poussée à droite : tri (sans « Fiabilité » tant que le
                health score n'existe pas) + Reset. Le bouton « Comparer » du haut a
                été retiré : la barre de sélection flottante (en bas) le fournit déjà
                dès qu'on coche des offres. */}
            <div className="cmp-fbar-actions">
              {tab === 'eval' || tab === 'funded' ? (
                /* Tri = MÊME design que les filtres (chip déroulant), pas des pastilles
                   à part : un seul menu compact, cohérent avec la rangée de filtres. */
                <FilterMenu label={d.sort} align="end">
                  <CheckList
                    items={SORT_OPTIONS(d, tab, hasHealth).map((o) => ({ value: o.value, label: o.label }))}
                    selected={[sortEff]}
                    onToggle={(v) => { setPreset(null); setSort(v as SortKey); }}
                  />
                </FilterMenu>
              ) : null}

              <button
                type="button"
                className="cmp-abtn cmp-abtn--reset cmp-fbar-reset"
                onClick={reset}
                disabled={!active}
              >
                {d.reset}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Colonne résultats — pleine hauteur (col 2) : la liste défile seule ; tout
          le chrome (onglets, actions, filtres) est fixe au-dessus. */}
      <div className="cmp-main">
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
      ) : tab === 'firm' ? (
        /* ---------- Vue Firm (agrégat, design repris de la home) ---------- */
        <div className="cmp-oscroll">
          <div className="term-scroll">
            <div className="term-grid term-grid--firms">
              <div className="term-row term-hrow" aria-hidden="true">
                <span className="term-c-rank">{d.colRank}</span>
                <span>{d.colFirm}</span>
                <span className="term-c-center">{d.colRating}</span>
                <span className="term-c-center">{d.colCountry}</span>
                <span className="term-c-center">{d.colSince}</span>
                <span>{d.colPlatforms}</span>
                <span className="term-c-num">{d.colAlloc}</span>
                <span>{d.colPromo}</span>
                <span />
              </div>
              {firmRows.map((f, idx) => {
                const logo = firmLogo(f.slug);
                return (
                  <button
                    key={f.slug}
                    type="button"
                    className={`term-row term-frow${idx === 0 ? ' is-top' : ''}`}
                    style={{ '--i': idx } as React.CSSProperties}
                    aria-label={`${f.name}, ${d.colRating} ${f.rating ?? d.rankNoRating} · ${d.firmRowCta}`}
                    onClick={() => {
                      setPreset(null);
                      setFilters((prev) => ({ ...prev, firms: [f.slug] }));
                      setTab('eval');
                    }}
                  >
                    <span className="term-c-rank tnum" data-label={d.colRank}>{idx + 1}</span>
                    <span className="term-firm" data-label={d.colFirm}>
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
                        <span className="term-firm-plan">{fillTpl(d.rankOffers, { n: compact(f.offerCount) })}</span>
                      </span>
                    </span>
                    <span className="term-cnote" data-label={d.colRating}>
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
                              <span key={p} className="term-plat" title={platformNames[p] ?? p}>
                                {pl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={pl.url} alt={platformNames[p] ?? p} />
                                ) : (
                                  <span className="term-plat-txt">{(platformNames[p] ?? p).slice(0, 2)}</span>
                                )}
                              </span>
                            );
                          })}
                          {f.platformTotal > f.platforms.length ? (
                            <span className="term-plat-more">+{compact(f.platformTotal - f.platforms.length)}</span>
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
                    <span className="term-fpromo" data-label={d.colPromo}>
                      {f.promo ? (
                        <span className="promo-coupon">
                          <span className="pc-left">
                            <span className="pc-off">{f.promo.discountPct != null ? compact(f.promo.discountPct) : ''}%<b>OFF</b></span>
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
                    <span className="term-buy" aria-hidden="true">{d.firmRowCta}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : tab === 'offers' ? (
        /* ---------- Vue Offres (cartes foil + firm + coupon, design de la home) ---------- */
        promoRows.length === 0 ? (
          <div className="card cmp-empty">
            <h2 className="cmp-empty-t">{d.emptyTitle}</h2>
            <p className="cmp-empty-b">{d.emptyBody}</p>
          </div>
        ) : (
          <div className="promo-offers">
            {promoRows.map((f) => {
              const logo = firmLogo(f.slug);
              const promo = f.promo!;
              return (
                <article key={f.slug} className="promo-offer">
                  <span className="po-foil">
                    <span className="po-off">{promo.discountPct != null ? compact(promo.discountPct) : ''}%<b>OFF</b></span>
                    <span className="po-tag">{promo.exclusive ? d.promoExclusive : d.promoGeneric}</span>
                  </span>
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
                        {f.entryPrice != null ? (
                          <span className="po-price tnum">{d.termFloor} {money(f.entryPrice, f.currency)}</span>
                        ) : null}
                      </span>
                    </span>
                  </span>
                  <span className="po-coupon">
                    <span className="pcc-stub">{d.promoCodeLabel}</span>
                    <span className="pcc-code"><CopyCode code={promo.code} label={d.copyCode} /></span>
                  </span>
                  <button
                    type="button"
                    className="po-apply"
                    onClick={() => {
                      setPreset(null);
                      setFilters((prev) => ({ ...prev, firms: [f.slug] }));
                      setTab('eval');
                    }}
                  >
                    {d.promoApply}
                  </button>
                </article>
              );
            })}
          </div>
        )
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
                  <span role="columnheader" className="cmp-col-center">{d.colPromo}</span>
                  <span role="columnheader">{d.colActivation}</span>
                  <span role="columnheader">{d.colPlatforms}</span>
                  <span role="columnheader" className="cmp-col-center">{d.colDrawdown}</span>
                  <span role="columnheader">{d.colTarget}</span>
                </>
              ) : (
                <>
                  <span role="columnheader">{d.colConsistencyFunded}</span>
                  <span role="columnheader" className="cmp-col-center">{d.colDrawdownFunded}</span>
                  <span role="columnheader" className="cmp-col-center">{d.colSplit}</span>
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

      {/* Repère de fraîcheur des données, en bas de liste (déplacé depuis la barre
          du haut) : « données générées le … », là où une note de bas de tableau a
          du sens plutôt que flottant à côté des onglets. */}
      <p className="cmp-genfoot" title={d.generatedAt}>
        {d.generatedAt} <span className="num">{generatedAt.slice(0, 10)}</span>
      </p>
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
          tab={tab}
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
  tab,
  compact,
  onlyDiff,
  setOnlyDiff,
  onClose,
}: {
  rows: CompareRow[];
  offers: PublicOffer[];
  d: ComparatorDict;
  tab: Tab;
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

  /* On ne montre QUE les phases de l'onglet lu : sur Challenge, la section
     financée est hors contexte (et inversement). Le prix et la confiance
     s'affichent toujours. Le libellé porte déjà la phase (« Cohérence
     (évaluation) » / « (retrait) »), donc plus besoin de titres de section. */
  const scope: CompareRow['phase'][] =
    tab === 'funded' ? ['funded', 'trust'] : ['price', 'eval', 'trust'];
  const inScope = rows.filter((r) => scope.includes(r.phase));
  /* En « différences seulement », on garde aussi les lignes `alwaysShow` : le
     durcissement (savoir qu'AUCUNE offre ne durcit est une info) et la date de
     vérification (signal de confiance à ne jamais masquer, même identique). */
  const visible = onlyDiff ? inScope.filter((r) => r.differs || r.alwaysShow) : inScope;

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
            className={`cmp-cmp${onlyDiff ? ' is-onlydiff' : ''}`}
            style={{ '--n': offers.length } as React.CSSProperties}
          >
            <div className="cmp-cmp-head">
              <span />
              {offers.map((o) => {
                const logo = firmLogo(o.firm.slug);
                return (
                  <span key={o.id} className="cmp-cmp-col">
                    <span className={`term-logo${logo && !logo.light ? ' lift' : ''}`} aria-hidden="true">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
                      ) : (
                        o.firm.name.trim().slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="cmp-cmp-firm-txt">
                      <strong>{o.firm.name}</strong>
                      <span className="cmp-cmp-plan">{o.plan.name} · <span className="num">{compact(o.size)}</span></span>
                    </span>
                    {o.plan.rating != null ? <NoteRing rating={o.plan.rating} size={34} /> : null}
                  </span>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <p className="cmp-empty-b cmp-cmp-none">{d.compareNothing}</p>
            ) : (
              <div className="cmp-cmp-body">
                {visible.map((r) => (
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
              </div>
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
