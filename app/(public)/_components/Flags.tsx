'use client';

import { useId, type ReactElement } from 'react';
import type { Locale } from '@/lib/i18n/comparator';

/**
 * Drapeaux ronds en SVG inline, partagés par le header et le footer.
 * SVG (jamais d'emoji : les emojis drapeaux s'affichent en lettres sous Windows).
 * `useId` scope les clip-paths du drapeau UK pour que deux instances sur la même
 * page (header + footer) ne collisionnent pas.
 */

export function FrFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="flag-svg" aria-hidden="true">
      <rect width="1" height="2" x="0" fill="#002654" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ce1126" />
    </svg>
  );
}

export function GbFlag() {
  const raw = useId().replace(/[:]/g, '');
  const s = `s${raw}`;
  const t = `t${raw}`;
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="flag-svg" aria-hidden="true">
      <clipPath id={s}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={t}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${s})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${t})`} stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}

export const FLAGS: Record<Locale, () => ReactElement> = { fr: FrFlag, en: GbFlag };

export function FlagRound({ locale }: { locale: Locale }) {
  const F = FLAGS[locale];
  return (
    <span className="flag-round">
      <F />
    </span>
  );
}
