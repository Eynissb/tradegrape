'use client';

import { useState } from 'react';
import { firmLogo, firmColor } from '@/lib/catalog/logos';

/**
 * Filtre « prop firm » de la colonne de gauche — liste VERTICALE, une firm par
 * ligne : case à cocher + logo + nom alignés (façon MAPROPFIRM), et non des
 * pilules tassées. « Voir tout » déroule au-delà de LIMIT.
 */

interface Firm {
  slug: string;
  name: string;
}

function FirmMark({ slug, name }: Firm) {
  const [broken, setBroken] = useState(false);
  const meta = firmLogo(slug);
  if (meta && !broken) {
    return (
      <span className={`cmp-sidef-logo ${meta.light ? '' : 'lift'}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={meta.url} alt="" style={{ transform: `scale(${meta.scale})` }} onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className="cmp-sidef-logo cmp-sidef-logo--mono" style={{ backgroundImage: firmColor(name) }} aria-hidden="true">
      {name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function SideFirms({
  firms,
  selected,
  onToggle,
  label,
  seeAll,
  seeLess,
}: {
  firms: Firm[];
  selected: string[];
  onToggle: (slug: string) => void;
  label: string;
  seeAll: string;
  seeLess: string;
}) {
  const [open, setOpen] = useState(false);
  const LIMIT = 6;
  const shown = open ? firms : firms.slice(0, LIMIT);

  return (
    <fieldset className="cmp-fgroup cmp-sidegroup">
      <legend>{label}</legend>
      <div className="cmp-sidef-list">
        {shown.map((f) => {
          const on = selected.includes(f.slug);
          return (
            <label key={f.slug} className={`cmp-sidef${on ? ' is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(f.slug)} />
              <span className="cmp-sidef-box">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8" /></svg>
              </span>
              <FirmMark slug={f.slug} name={f.name} />
              <span className="cmp-sidef-name">{f.name}</span>
            </label>
          );
        })}
      </div>
      {firms.length > LIMIT ? (
        <button type="button" className="cmp-seeall" onClick={() => setOpen((o) => !o)}>
          {open ? seeLess : seeAll}
          <svg viewBox="0 0 16 16" fill="none" className={open ? 'is-open' : ''} aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </fieldset>
  );
}
