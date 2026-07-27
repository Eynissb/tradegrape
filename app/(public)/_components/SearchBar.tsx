'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { comparatorHref, type Locale } from '@/lib/i18n/comparator';

/**
 * Recherche du header. Cherche dans les prop firms PUBLIÉES et VÉRIFIÉES
 * (via `/api/public/search-index`) — jamais les brouillons, non-vérifiées, ni
 * Alpha Futures. Chaque résultat montre le logo de la firm (initiales en
 * fallback), son nom, le plan de l'offre la moins chère et son prix TTC ; un
 * clic mène au comparateur filtré sur la firm. Index chargé une fois, au focus.
 */

interface Firm {
  name: string;
  slug: string;
  logo: string | null;
  plan: string | null;
  priceTtc: number | null;
  currency: string;
}

/** Pastille de logo : image de la firm, ou ses initiales sur fond de marque. */
function FirmMark({ firm }: { firm: Firm }) {
  const [broken, setBroken] = useState(false);
  const initials = firm.name.trim().slice(0, 2).toUpperCase();
  if (firm.logo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="pub-search-logo" src={firm.logo} alt="" aria-hidden="true" onError={() => setBroken(true)} />
    );
  }
  return <span className="pub-search-logo pub-search-logo--txt" aria-hidden="true">{initials}</span>;
}

export default function SearchBar({
  locale,
  variant = 'header',
}: {
  locale: Locale;
  variant?: 'header' | 'drawer';
}) {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[] | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const go = (f: Firm) => {
    setOpen(false);
    setQ('');
    router.push(`${comparatorHref(locale)}?firm=${encodeURIComponent(f.slug)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
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
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Placeholder court au repos (champ compact), complet une fois étendu au focus.
  const placeholder =
    open || variant === 'drawer'
      ? locale === 'fr' ? 'Rechercher une prop firm…' : 'Search a prop firm…'
      : locale === 'fr' ? 'Rechercher…' : 'Search…';
  const money = (v: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `${Math.round(v)} ${currency}`;
    }
  };

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
              {f.priceTtc !== null ? (
                <span className="pub-search-price num">{money(f.priceTtc, f.currency)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
