'use client';

import { useEffect } from 'react';

/**
 * Garde globale des champs numériques : sur un formulaire financier, scroller
 * la page avec le curseur sur un champ montant focalisé peut en changer la
 * valeur en silence. On blur le champ au wheel → la page défile, la valeur
 * reste intacte. Monté une fois dans le layout racine.
 */
export default function InputGuards() {
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      const t = e.target;
      if (
        t instanceof HTMLInputElement &&
        t.type === 'number' &&
        t === document.activeElement
      ) {
        t.blur();
      }
    }
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  return null;
}
