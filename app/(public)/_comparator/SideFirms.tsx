'use client';

import { useState } from 'react';
import { firmLogo, platformLogo, firmColor } from '@/lib/catalog/logos';

/**
 * Filtre en LISTE VERTICALE de la colonne de gauche — une entrée par ligne :
 * case à cocher + logo/icône coloré + nom alignés (façon MAPROPFIRM). Sert les
 * prop firms (`kind="firm"`) ET les plateformes (`kind="platform"`). « Voir tout »
 * déroule au-delà de LIMIT.
 */

interface Item {
  slug: string;
  name: string;
}

type Kind = 'firm' | 'platform';

/** Glyphe générique « plateforme » (repli quand aucun fichier de logo). */
function PlatformGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6.5 14l3-3.5 2.5 2 3.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ItemMark({ slug, name, kind }: Item & { kind: Kind }) {
  const [broken, setBroken] = useState(false);
  const meta = kind === 'platform' ? platformLogo(slug) : firmLogo(slug);
  if (meta && !broken) {
    return (
      <span className={`cmp-sidef-logo ${meta.light ? '' : 'lift'}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.url} alt="" style={{ transform: `scale(${meta.scale})` }} onError={() => setBroken(true)} />
      </span>
    );
  }
  if (kind === 'platform') {
    return <span className="cmp-sidef-logo cmp-sidef-logo--gen" aria-hidden="true"><PlatformGlyph /></span>;
  }
  return (
    <span className="cmp-sidef-logo cmp-sidef-logo--mono" style={{ backgroundImage: firmColor(name) }} aria-hidden="true">
      {name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function SideFirms({
  items,
  selected,
  onToggle,
  label,
  seeAll,
  seeLess,
  kind = 'firm',
}: {
  items: Item[];
  selected: string[];
  onToggle: (slug: string) => void;
  label: string;
  seeAll: string;
  seeLess: string;
  kind?: Kind;
}) {
  const [open, setOpen] = useState(false);
  const LIMIT = 6;
  const shown = open ? items : items.slice(0, LIMIT);

  return (
    <div className="cmp-fgroup cmp-sidegroup" role="group" aria-label={label}>
      <span className="cmp-side-ct">{label}</span>
      <div className="cmp-sidef-list">
        {shown.map((f) => {
          const on = selected.includes(f.slug);
          return (
            <label key={f.slug} className={`cmp-sidef${on ? ' is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(f.slug)} />
              <span className="cmp-sidef-box">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
              </span>
              <ItemMark slug={f.slug} name={f.name} kind={kind} />
              <span className="cmp-sidef-name">{f.name}</span>
            </label>
          );
        })}
      </div>
      {items.length > LIMIT ? (
        <button type="button" className="cmp-seeall" onClick={() => setOpen((o) => !o)}>
          {open ? seeLess : seeAll}
          <svg viewBox="0 0 16 16" fill="none" className={open ? 'is-open' : ''} aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
