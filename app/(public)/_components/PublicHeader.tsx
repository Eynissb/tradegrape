'use client';

import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LOCALES, comparatorHref, type Locale } from '@/lib/i18n/comparator';
import SearchBar from './SearchBar';

/**
 * En-tête public — deux niveaux, façon PropFirmMatch mais ÉPURÉ.
 *
 *  1. Barre supérieure fine, discrète, FERMABLE (un message clé) — disparaît au
 *     scroll, se souvient de la fermeture (localStorage).
 *  2. Header principal : logo à gauche ; centre RÉSERVÉ au futur switch
 *     Futures/Forex/Crypto (pas encore affiché) ; à droite langue ronde,
 *     « Connexion » discret, « Commencer » en pilule primaire.
 *  3. Ligne de nav de contenu : Comparateur / Journal / Guides ; l'onglet actif
 *     en `.control--active` (repris du journal).
 *
 * Header sticky ; la barre supérieure peut disparaître, le header principal
 * reste. Système Tradawave (violet-magenta), liquid glass. Drapeaux en SVG.
 */

/* ---- Drapeaux ronds, SVG inline ---- */

function FrFlag() {
  return (
    <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice" className="flag-svg" aria-hidden="true">
      <rect width="1" height="2" x="0" fill="#002654" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ce1126" />
    </svg>
  );
}

function GbFlag() {
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

const FLAGS: Record<Locale, () => ReactElement> = { fr: FrFlag, en: GbFlag };

function FlagRound({ locale }: { locale: Locale }) {
  const F = FLAGS[locale];
  return (
    <span className="flag-round">
      <F />
    </span>
  );
}

/* ---- Logo ---- */

function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="pub-brand-text grad-text">Tradegrape</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.svg" alt="Tradegrape" className="pub-logo-img" onError={() => setFailed(true)} />
  );
}

function navItems(l: Locale) {
  return [
    { label: l === 'fr' ? 'Comparateur' : 'Compare', href: comparatorHref(l) },
    { label: 'Journal', href: '/app' },
    { label: 'Guides', href: `/${l}/guides` },
  ];
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const TOPBAR_KEY = 'tg-topbar-dismissed';

export default function PublicHeader({ locale }: { locale: Locale }) {
  const l = locale;
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [topDismissed, setTopDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    try {
      if (localStorage.getItem(TOPBAR_KEY) === '1') setTopDismissed(true);
    } catch {
      /* localStorage indisponible : on garde la barre visible. */
    }
  }, []);

  // La barre supérieure disparaît au scroll ; le header principal reste.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const dismissTop = () => {
    setTopDismissed(true);
    try {
      localStorage.setItem(TOPBAR_KEY, '1');
    } catch {
      /* pas de persistance possible : la fermeture ne tiendra pas la session. */
    }
  };

  const others = LOCALES.filter((x) => x !== l);
  const nav = navItems(l);
  const ctaHref = authed ? '/app' : '/signup';
  const ctaLabel = authed
    ? l === 'fr' ? 'Mon journal' : 'My journal'
    : l === 'fr' ? 'Commencer' : 'Get started';
  const signinLabel = l === 'fr' ? 'Connexion' : 'Sign in';
  const topMsg = l === 'fr' ? 'Données vérifiées à la source et datées.' : 'Data verified at source and dated.';

  return (
    <>
      <div className="pub-headwrap">
        {/* 1. Barre supérieure fermable, disparaît au scroll. */}
        {!topDismissed ? (
          <div className={`pub-topbar${scrolled ? ' is-hidden' : ''}`} role="note">
            <span className="pub-topbar-dot" aria-hidden="true" />
            <span className="pub-topbar-msg">{topMsg}</span>
            <button
              type="button"
              className="pub-topbar-close"
              aria-label={l === 'fr' ? 'Fermer' : 'Dismiss'}
              onClick={dismissTop}
            >
              ×
            </button>
          </div>
        ) : null}

        {/* UNE seule capsule : tout sur une ligne. */}
        <header className="pub-header">
          <Link href={`/${l}`} className="pub-brand" aria-label="Tradegrape">
            <Logo />
          </Link>

          {/* Recherche au centre — prend l'espace. */}
          <SearchBar locale={l} />

          {/* Nav ; l'onglet actif en `.control--active` (repris du journal). */}
          <nav className="pub-nav" aria-label="Navigation principale">
            {nav.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`control control--sm ${active ? 'control--active' : 'control--ghost'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="pub-header-actions">
            <div className="pub-lang" ref={langRef}>
              <button
                type="button"
                className="pub-lang-btn"
                aria-haspopup="true"
                aria-expanded={langOpen}
                aria-label={`Langue : ${l.toUpperCase()}`}
                onClick={() => setLangOpen((o) => !o)}
              >
                <FlagRound locale={l} />
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
                      aria-label={x.toUpperCase()}
                      onClick={() => setLangOpen(false)}
                    >
                      <FlagRound locale={x} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {!authed ? (
              <Link href="/login" className="control control--sm pub-signin">
                {signinLabel}
              </Link>
            ) : null}
            <Link href={ctaHref} className="control control--sm control--primary pub-cta">
              {ctaLabel}
            </Link>

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
        </header>
      </div>

      {/* Tiroir mobile : nav + actions. */}
      <div className={`pub-drawer${drawer ? ' is-open' : ''}`} aria-hidden={!drawer}>
        <div className="pub-drawer-scrim" onClick={() => setDrawer(false)} />
        <nav className="pub-drawer-panel" aria-label="Navigation">
          <SearchBar locale={l} variant="drawer" />
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="pub-drawer-link" onClick={() => setDrawer(false)}>
              {n.label}
            </Link>
          ))}
          {!authed ? (
            <Link href="/login" className="control pub-drawer-signin" onClick={() => setDrawer(false)}>
              {signinLabel}
            </Link>
          ) : null}
          <Link href={ctaHref} className="control control--primary pub-drawer-cta" onClick={() => setDrawer(false)}>
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </>
  );
}
