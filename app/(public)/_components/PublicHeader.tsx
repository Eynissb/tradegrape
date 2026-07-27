'use client';

import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LOCALES, comparatorHref, type Locale } from '@/lib/i18n/comparator';

/**
 * En-tête public — CAPSULE flottante façon iOS.
 *
 * Pilule arrondie, détachée du haut (marge tout autour), verre liquide (fond
 * translucide + backdrop-filter, arête claire en haut, ombre douce dessous),
 * centrée sur une largeur maximale. Sticky au scroll ; se densifie légèrement
 * (`.is-solid`) pour rester lisible sur le contenu clair, sans perdre sa forme.
 *
 * Le contenu du hero commence SOUS la capsule (offset `--header-h`) : elle ne
 * chevauche jamais le titre.
 *
 * Drapeaux en SVG inline (jamais d'emoji : rendus en lettres sur Windows) →
 * rendu identique partout.
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

/* ---- Nav ---- */

function navItems(l: Locale) {
  return [
    { label: l === 'fr' ? 'Comparateur' : 'Compare', href: comparatorHref(l) },
    { label: 'Journal', href: '/app' },
    { label: 'Guides', href: `/${l}/guides` },
  ];
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

  // Densification au scroll : la capsule reste une capsule, fond plus opaque.
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
          {/* Sélecteur de langue rond, à drapeaux SVG. */}
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

          <Link href={ctaHref} className="pub-cta">
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

      {/* Tiroir mobile : la nav + le CTA (un seul système). */}
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
