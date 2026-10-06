'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NoteRing from '@/app/(public)/_home/NoteRing';

export interface TopCard {
  slug: string;
  name: string;
  rank: number;
  rating: number | null;
  ratingTone: string | null;
  priceLabel: string | null;
  logo: { url: string; scale: number; light?: boolean } | null;
  monogram: string;
}

interface Props {
  cards: TopCard[];
  href: string;
  labels: { title: string; verified: string; noRating: string; prev: string; next: string };
}

/**
 * Top 10 façon Netflix — carrousel NAVIGABLE (flèches gauche/droite) plutôt qu'un
 * marquee auto. Client component : les flèches pilotent le scroll de la piste et
 * s'éteignent aux extrémités. Le survol des cartes (lift + halo) n'est pas coupé
 * grâce à la marge verticale généreuse de la piste (cf. `.cap-top-track`).
 */
export default function HeroTopTen({ cards, href, labels }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="cap-top" aria-label={labels.title}>
      <div className="cap-top-head">
        <span className="cap-top-pill">
          <span className="term-live-dot" aria-hidden="true" />
          {labels.verified}
        </span>
        <h2 className="cap-top-title">{labels.title}</h2>
        <div className="cap-top-nav">
          <button
            type="button"
            className="cap-top-arrow"
            aria-label={labels.prev}
            onClick={() => scroll(-1)}
            disabled={atStart}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            className="cap-top-arrow"
            aria-label={labels.next}
            onClick={() => scroll(1)}
            disabled={atEnd}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <ul className="cap-top-track" ref={ref} onScroll={sync}>
        {cards.map((f) => (
          <li key={f.slug} className={`cap-top-item${f.rank === 1 ? ' is-first' : ''}`}>
            <Link href={href} className="cap-top-card">
              <span className="cap-top-rank" aria-hidden="true">{f.rank}</span>
              <span className={`cap-top-logo${f.logo && !f.logo.light ? ' lift' : ''}`} aria-hidden="true">
                {f.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.logo.url} alt="" style={{ transform: `scale(${f.logo.scale})` }} />
                ) : (
                  f.monogram
                )}
              </span>
              <span className="cap-top-info">
                <span className="cap-top-name">{f.name}</span>
                <span className="cap-top-meta">
                  {f.rating != null ? (
                    <NoteRing rating={f.rating} size={42} />
                  ) : (
                    <span className="cap-top-tbd">{labels.noRating}</span>
                  )}
                  {f.priceLabel ? <span className="cap-top-price tnum">{f.priceLabel}</span> : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
