import type { CSSProperties } from 'react';

/**
 * Note /10 en ANNEAU néon (arc dégradé + point lumineux qui marque la progression).
 * Composant PARTAGÉ (utilisable en server ET client — aucun hook) pour que le Top 10,
 * les tableaux et les cartes offres parlent le même langage visuel.
 *
 * `size` (px) est optionnel : l'anneau est dimensionné en `em` relatif à --sz, donc
 * tout (trou, point, chiffre) reste proportionnel. Défaut : 50px.
 */
export default function NoteRing({ rating, size }: { rating: number; size?: number }) {
  const tone = rating >= 8 ? 'ok' : rating >= 4 ? 'warn' : 'bad';
  const style = {
    '--p': String(Math.max(0, Math.min(10, rating)) * 10),
    ...(size ? { '--sz': `${size}px` } : {}),
  } as CSSProperties;

  return (
    <span className={`term-noter term-noter--${tone}`} style={style} aria-label={`${rating}/10`}>
      <span className="term-noter-disc" aria-hidden="true" />
      <span className="term-noter-hole" aria-hidden="true" />
      <span className="term-noter-end" aria-hidden="true" />
      <span className="term-noter-val">{rating}</span>
    </span>
  );
}
