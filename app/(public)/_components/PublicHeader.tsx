'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LOCALES, comparatorHref, type Locale } from '@/lib/i18n/comparator';

/**
 * En-tête public — fondu dans le hero.
 *
 * En HAUT de page : transparent, aucun fond, aucune bordure, aucun
 * `backdrop-filter`. Il flotte sur l'image de la grappe, on ne voit aucune
 * limite avec le hero.
 *
 * AU SCROLL : dès que le hero n'est plus derrière (IntersectionObserver), la
 * barre prend un fond translucide sombre + `backdrop-filter` pour rester lisible
 * sur le contenu. Sur une page SANS hero (comparateur…), pas de hero à observer
 * → la barre est solide d'emblée.
 *
 * Contenu : logo (grappe + nom, fallback texte), nav, sélecteur de langue rond
 * à drapeaux, CTA conscient de la session. Mobile : nav dans un tiroir, le
 * sélecteur reste visible.
 */

const FLAG: Record<Locale, string> = { fr: '🇫🇷', en: '🇬🇧' };

function navItems(l: Locale) {
  return [
    { label: l === 'fr' ? 'Comparateur' : 'Compare', href: comparatorHref(l) },
    { label: 'Journal', href: '/app' },
    { label: 'Guides', href: `/${l}/guides` },
  ];
}

function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    // Fallback texte si l'asset manque — jamais de logo cassé.
    return <span className="pub-brand-text grad-text">Tradegrape</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.svg"
      alt="Tradegrape"
      className="pub-logo-img"
      onError={() => setFailed(true)}
    />
  );
}

export default function PublicHeader({ locale }: { locale: Locale }) {
  const l = locale;
  const [solid, setSolid] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Session : CTA « Ouvrir le journal » (connecté) vs « Connexion ».
  useEffect(() => {
    const sb = createClient();
    let on = true;
    sb.auth.getSession().then(({ data }) => on && setAuthed(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => on && setAuthed(!!s));
    return () => {
      on = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fond au scroll : solide quand le hero n'est plus derrière. Pas de hero → solide.
  useEffect(() => {
    const hero = document.querySelector('.home-hero');
    if (!hero) {
      setSolid(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setSolid(!e.isIntersecting), {
      rootMargin: '-72px 0px 0px 0px',
      threshold: 0,
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // Fermeture du popover langue au clic extérieur / Échap.
  useEffect(() => {
    if (!langOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLangOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  const others = LOCALES.filter((x) => x !== l);
  const nav = navItems(l);
  const ctaLabel = authed
    ? l === 'fr' ? 'Ouvrir le journal' : 'Open journal'
    : l === 'fr' ? 'Connexion' : 'Sign in';
  const ctaHref = authed ? '/app' : '/login';

  return (
    <>
      <header className={`pub-header${solid ? ' is-solid' : ''}`}>
        <div className="pub-header-inner">
          <Link href={`/${l}`} className="pub-brand" aria-label="Tradegrape">
            <Logo />
          </Link>

          <nav className="pub-nav" aria-label="Navigation principale">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="pub-navlink">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="pub-header-right">
            {/* Sélecteur de langue rond, à drapeaux. */}
            <div className="pub-lang" ref={langRef}>
              <button
                type="button"
                className="pub-lang-btn"
                aria-haspopup="true"
                aria-expanded={langOpen}
                aria-label={`Langue : ${l.toUpperCase()}`}
                onClick={() => setLangOpen((o) => !o)}
              >
                <span aria-hidden="true">{FLAG[l]}</span>
              </button>
              {langOpen ? (
                <div className="pub-lang-pop" role="menu">
                  {others.map((x) => (
                    <Link
                      key={x}
                      href={`/${x}`}
                      hrefLang={x}
                      className="pub-lang-opt"
                      role="menuitem"
                      onClick={() => setLangOpen(false)}
                    >
                      <span aria-hidden="true">{FLAG[x]}</span>
                      <span className="sr-only">{x.toUpperCase()}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* CTA conscient de la session. */}
            <Link href={ctaHref} className="pub-cta">
              {ctaLabel}
            </Link>

            {/* Ouverture du tiroir mobile. */}
            <button
              type="button"
              className="pub-burger"
              aria-label="Menu"
              aria-expanded={drawer}
              onClick={() => setDrawer((d) => !d)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Tiroir mobile : la nav (un seul système). */}
      <div className={`pub-drawer${drawer ? ' is-open' : ''}`} aria-hidden={!drawer}>
        <div className="pub-drawer-scrim" onClick={() => setDrawer(false)} />
        <nav className="pub-drawer-panel" aria-label="Navigation">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="pub-drawer-link" onClick={() => setDrawer(false)}>
              {n.label}
            </Link>
          ))}
          <Link href={ctaHref} className="pub-drawer-cta" onClick={() => setDrawer(false)}>
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </>
  );
}
