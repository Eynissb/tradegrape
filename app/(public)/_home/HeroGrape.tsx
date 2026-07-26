'use client';

import { useEffect, useRef } from 'react';

/**
 * Visuel du hero : la grappe (l'emblème de marque) flottant dans le vide noir.
 *
 * DEUX couches, pour ne JAMAIS montrer un vide (règle transverse « une image
 * absente ne casse jamais le rendu ») :
 *  - un fallback SVG grappe, toujours rendu, en dessous ;
 *  - la photo réelle (`/brand/hero-grape.png`) en `background-image` au-dessus.
 *    La photo a un fond noir opaque : présente, elle recouvre le SVG ; absente
 *    (404), le SVG reste visible.
 *
 * `background-image` plutôt qu'`<img>` : jamais l'élément LCP → le titre reste
 * LCP, « aucun impact LCP » respecté.
 *
 * Animations légères, toutes désactivables :
 *  - flottement doux (CSS) ; lueur qui respire (CSS, décor → violet permis) ;
 *  - parallaxe souris (JS) — desktop au pointeur fin seulement.
 * `prefers-reduced-motion` coupe tout ; mobile / pointeur grossier : image fixe.
 */

/* Positions d'une grappe en grappe triangulaire (viewBox 0 0 206 232). */
const GRAPES: ReadonlyArray<readonly [number, number]> = [
  [72, 64], [103, 58], [134, 64],
  [57, 92], [88, 86], [118, 86], [149, 92],
  [72, 120], [103, 114], [134, 120],
  [82, 147], [113, 141], [143, 147],
  [94, 173], [125, 168],
  [108, 198],
];
const R = 18;

export default function HeroGrape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return; // pas de parallaxe si animations réduites ou tactile

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 2;
        const dy = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--px', `${dx * 14}px`);
        el.style.setProperty('--py', `${dy * 14}px`);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="home-hero-grape" aria-hidden="true">
      <div className="home-grape-glow" />
      <div className="home-grape-float">
        {/* Fallback : grappe dessinée, visible tant que la photo n'est pas là. */}
        <svg className="home-grape-fallback" viewBox="0 0 206 232" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grape-body" cx="36%" cy="30%" r="72%">
              <stop offset="0" stopColor="#e2b3ff" />
              <stop offset="0.45" stopColor="var(--c2)" />
              <stop offset="1" stopColor="#2a1550" />
            </radialGradient>
          </defs>
          {/* tige */}
          <path d="M104 58 C 110 34, 126 24, 138 14" stroke="var(--c1)" strokeWidth="6"
            strokeLinecap="round" opacity="0.8" />
          {GRAPES.map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={R} fill="url(#grape-body)"
                stroke="rgba(255,255,255,0.14)" />
              <circle cx={cx - 6} cy={cy - 6} r={4.5} fill="#fff" opacity="0.35" />
            </g>
          ))}
        </svg>
        {/* Photo réelle — recouvre le fallback dès qu'elle est déposée. */}
        <div className="home-grape-img" />
      </div>
    </div>
  );
}
