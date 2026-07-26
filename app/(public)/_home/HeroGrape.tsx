'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond du hero : la grappe en pleine largeur/hauteur (`cover`), ancrée à droite,
 * sous un voile dégradé qui va du noir opaque à gauche (où est le texte) vers
 * transparent à droite (où reste la grappe).
 *
 * Un seul plan : image de fond + voile + (le texte est superposé par la page).
 * `background-image` plutôt qu'`<img>` → jamais l'élément LCP, le titre reste LCP.
 * Image absente = hero sombre, texte lisible quand même : rien ne casse.
 *
 * Parallaxe souris légère sur l'image (desktop, pointeur fin, hors
 * reduced-motion). L'image est légèrement débordante + scale pour que la
 * parallaxe ne révèle jamais de bord.
 */
export default function HeroGrape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 2;
        const dy = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--px', `${dx * 10}px`);
        el.style.setProperty('--py', `${dy * 10}px`);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="home-hero-bg" aria-hidden="true">
      <div ref={ref} className="home-hero-img" />
      {/* Lueur AU-DESSUS de l'image (blend screen) : elle balaie la grappe comme
          un reflet mouvant, illumine le verre sans l'écraser. */}
      <div className="home-hero-glow" />
      {/* Voile : sombre à gauche (texte), transparent à droite (grappe). */}
      <div className="home-hero-veil" />
    </div>
  );
}
