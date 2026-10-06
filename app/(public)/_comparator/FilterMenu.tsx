'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Chip-déroulant de la BARRE DE FILTRES horizontale (remplace le rail gauche
 * facon concurrent). Un déclencheur (libellé + compteur d'actifs + chevron) ouvre
 * un panneau flottant ; fermeture au clic extérieur / Échap. Le compteur rend le
 * filtre actif visible sans ouvrir le menu. Pur présentation — l'état des filtres
 * reste géré par ComparatorView.
 */
export default function FilterMenu({
  label,
  count = 0,
  wide = false,
  align = 'start',
  children,
}: {
  label: string;
  /** Nombre d'options actives (badge). 0 → pas de badge, chip au repos. */
  count?: number;
  /** Panneau large (listes firms/plateformes). */
  wide?: boolean;
  /** Alignement du panneau sous le chip. */
  align?: 'start' | 'end';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="cmp-fmenu" ref={ref}>
      <button
        type="button"
        className={`cmp-fmenu-btn${count ? ' is-on' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cmp-fmenu-lbl">{label}</span>
        {count ? <span className="cmp-fmenu-badge num">{count}</span> : null}
        <svg className="cmp-fmenu-chev" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div
          className={`cmp-fmenu-pop${wide ? ' cmp-fmenu-pop--wide' : ''}${align === 'end' ? ' cmp-fmenu-pop--end' : ''}`}
          role="dialog"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
