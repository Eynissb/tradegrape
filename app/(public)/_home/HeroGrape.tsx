'use client';

import { useEffect, useRef } from 'react';

/**
 * Visuel du hero : la grappe (l'emblème de marque) flottant dans le vide noir.
 *
 * Image en `background-image` CSS, pas en `<img>` :
 *  - un fichier absent dégrade en vide (aucune icône cassée) ;
 *  - une image de fond n'est jamais l'élément LCP → le titre reste LCP,
 *    « aucun impact LCP » respecté.
 *
 * Trois animations légères, toutes désactivables :
 *  - flottement doux (CSS, sur l'image) ;
 *  - lueur qui respire (CSS, sur le halo — décor, donc violet autorisé) ;
 *  - parallaxe souris (JS, sur le wrapper) — desktop au pointeur fin seulement.
 *
 * `prefers-reduced-motion` coupe tout ; sur mobile / pointeur grossier, pas de
 * parallaxe et le CSS fige les animations (image fixe).
 */
export default function HeroGrape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Pas de parallaxe si l'utilisateur réduit les animations ou est au tactile.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 2; // -1 → 1
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
      <div className="home-grape-img" />
    </div>
  );
}
