'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { comparatorHref, type Locale } from '@/lib/i18n/comparator';
import { firmLogo, firmColor } from '@/lib/catalog/logos';
import NoteRing from '@/app/(public)/_home/NoteRing';

/**
 * Recherche du header. Cherche dans les prop firms PUBLIÉES et VÉRIFIÉES
 * (`/api/public/search-index`). En modal (réf. « Search Firm ») : historique
 * (localStorage) + firms populaires, chaque ligne = logo + nom + anneau de note,
 * drapeau pays, et années d'activité. On n'affiche PAS de compteur d'avis (§8 : on
 * n'a pas d'avis). Un clic mène au comparateur filtré sur la firm.
 */

interface Firm {
  name: string;
  slug: string;
  logo: string | null;
  plan: string | null;
  priceTtc: number | null;
  currency: string;
  rating: number | null;
  country: string | null;
  foundedYear: number | null;
}

const HISTORY_KEY = 'tg-search-history';

/**
 * Pastille de logo — MÊME traitement que la home (`.term-logo` + `firmLogo`) :
 * le vrai logo de marque déposé dans `public/brand/`, agrandi pour remplir la
 * pastille (fond clair si tracé sombre, sombre sinon). Repli : monogramme sur
 * une teinte de marque stable. Un slug sans logo NE CASSE PAS la ligne.
 */
function FirmMark({ firm }: { firm: Firm }) {
  const logo = firmLogo(firm.slug);
  if (logo) {
    return (
      <span className={`term-logo${logo.light ? '' : ' lift'}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.url} alt="" style={{ transform: `scale(${logo.scale})` }} />
      </span>
    );
  }
  return (
    <span className="term-logo" aria-hidden="true" style={{ background: firmColor(firm.name) }}>
      {firm.name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}

function CountryTag({ code }: { code: string | null }) {
  if (!code) return <span className="ps-muted">—</span>;
  const cc = code.toLowerCase();
  return (
    <span className="ps-country">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ps-flag" src={`https://flagcdn.com/w40/${cc}.png`} srcSet={`https://flagcdn.com/w80/${cc}.png 2x`} alt="" width={26} height={26} loading="lazy" />
      <span className="ps-cc">{code.toUpperCase()}</span>
    </span>
  );
}

/**
 * Année de création — le FAIT brut (« 2015 »), pas une durée calculée : plus
 * honnête, data-first, et distinct de l'anneau du concurrent (§9). Chiffre seul,
 * gros et tabulaire, sous la colonne « Depuis ».
 */
function YearsStat({ foundedYear }: { foundedYear: number | null }) {
  if (!foundedYear) return <span className="ps-muted">—</span>;
  return (
    <span className="ps-years tnum" aria-label={`${foundedYear}`}>
      {foundedYear}
    </span>
  );
}

/** Ligne riche du modal : firm (logo + nom + note) · pays · ancienneté. */
function RichRow({ firm, onSelect }: { firm: Firm; onSelect: () => void }) {
  return (
    <button type="button" className="ps-row" onClick={onSelect}>
      <span className="ps-firm">
        <FirmMark firm={firm} />
        <span className="ps-firm-txt">
          <span className="ps-name">{firm.name}</span>
          {firm.rating != null ? (
            <NoteRing rating={firm.rating} size={34} />
          ) : (
            <span className="ps-tbd">—</span>
          )}
        </span>
      </span>
      <CountryTag code={firm.country} />
      <YearsStat foundedYear={firm.foundedYear} />
    </button>
  );
}

export default function SearchBar({
  locale,
  variant = 'header',
  onNavigate,
}: {
  locale: Locale;
  variant?: 'header' | 'drawer' | 'modal';
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[] | null>(null);
  const [history, setHistory] = useState<Firm[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (fr: string, en: string) => (locale === 'fr' ? fr : en);

  const load = () => {
    if (firms !== null) return;
    fetch('/api/public/search-index')
      .then((r) => r.json())
      .then((d) => setFirms(Array.isArray(d.firms) ? d.firms : []))
      .catch(() => setFirms([]));
  };

  const query = q.trim().toLowerCase();
  const results =
    query.length === 0
      ? []
      : (firms ?? []).filter((f) => f.name.toLowerCase().includes(query)).slice(0, 6);
  const trending = [...(firms ?? [])]
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    .slice(0, 6);

  useEffect(() => {
    if (!open || variant === 'modal') return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, variant]);

  useEffect(() => {
    if (variant !== 'modal') return;
    load();
    setOpen(true);
    inputRef.current?.focus();
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(Array.isArray(h) ? h.slice(0, 4) : []);
    } catch {
      /* pas d'historique */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const clearHistory = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* noop */
    }
    setHistory([]);
  };

  const go = (f: Firm) => {
    try {
      const next = [f, ...history.filter((x) => x.slug !== f.slug)].slice(0, 4);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setOpen(false);
    setQ('');
    onNavigate?.();
    router.push(`${comparatorHref(locale)}?firm=${encodeURIComponent(f.slug)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (variant === 'modal') onNavigate?.();
      else setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const f = results[active];
      if (f) go(f);
    }
  };

  /* ─────────── MODAL (réf. « Search Firm ») ─────────── */
  if (variant === 'modal') {
    return (
      <div className="pub-search pub-search--modal" ref={rootRef}>
        <div className="ps-head">
          <h2 className="ps-title">{t('Rechercher une firm', 'Search a firm')}</h2>
          <button type="button" className="ps-close" aria-label={t('Fermer', 'Close')} onClick={() => onNavigate?.()}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="ps-field">
          <svg className="ps-field-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="ps-input"
            placeholder={t('Rechercher…', 'Search…')}
            value={q}
            aria-label={t('Rechercher une firm', 'Search a firm')}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="ps-body">
        {query ? (
          <div className="ps-section">
            {results.length ? (
              <div className="ps-list">
                {results.map((f) => (
                  <RichRow key={f.slug} firm={f} onSelect={() => go(f)} />
                ))}
              </div>
            ) : (
              <p className="ps-empty">{t('Aucune firm trouvée', 'No firm found')}</p>
            )}
          </div>
        ) : (
          <>
            <div className="ps-section">
              <div className="ps-sh">
                <span className="ps-sh-l">
                  <svg className="ps-sh-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t('Historique', 'History')}
                </span>
                {history.length ? (
                  <button type="button" className="ps-clear" onClick={clearHistory}>
                    {t('Tout effacer', 'Clear all')}
                  </button>
                ) : null}
              </div>
              {history.length ? (
                <div className="ps-list">
                  {history.map((f) => (
                    <RichRow key={f.slug} firm={f} onSelect={() => go(f)} />
                  ))}
                </div>
              ) : (
                <p className="ps-empty">{t('Pas encore d’historique', 'No history yet')}</p>
              )}
            </div>

            <div className="ps-section">
              <div className="ps-sh">
                <span className="ps-sh-l">
                  <svg className="ps-sh-ic ps-sh-ic--hot" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2c1 3-1 4-1 6a3 3 0 0 0 6 .5c1.5 2 2 3.5 2 5.5a7 7 0 1 1-13-3.5c1 1 2 1.2 3 .5-1.5-3 0-6 3-9z" />
                  </svg>
                  {t('Firms populaires', 'Popular firms')}
                </span>
              </div>
              <div className="ps-cols">
                <span>{t('Firm', 'Firm')}</span>
                <span>{t('Pays', 'Country')}</span>
                <span>{t('Depuis', 'Since')}</span>
              </div>
              <div className="ps-list">
                {trending.map((f) => (
                  <RichRow key={f.slug} firm={f} onSelect={() => go(f)} />
                ))}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    );
  }

  /* ─────────── HEADER / DRAWER (champ compact + dropdown) ─────────── */
  const placeholder =
    open || variant === 'drawer'
      ? t('Rechercher une prop firm…', 'Search a prop firm…')
      : t('Rechercher…', 'Search…');

  return (
    <div className={`pub-search pub-search--${variant}`} ref={rootRef}>
      <svg className="pub-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        className="pub-search-input"
        placeholder={placeholder}
        value={q}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="pub-search-list"
        aria-autocomplete="list"
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 ? (
        <ul className="pub-search-pop" id="pub-search-list" role="listbox">
          {results.map((f, i) => (
            <li
              key={f.slug}
              role="option"
              aria-selected={i === active}
              className={`pub-search-opt${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(f);
              }}
            >
              <FirmMark firm={f} />
              <span className="pub-search-lines">
                <span className="pub-search-name">{f.name}</span>
                {f.plan ? <span className="pub-search-plan">{f.plan}</span> : null}
              </span>
              {f.rating != null ? <NoteRing rating={f.rating} size={30} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
