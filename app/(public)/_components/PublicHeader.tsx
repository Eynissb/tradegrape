'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/(auth)/actions';
import { LOCALES, comparatorHref, type Locale } from '@/lib/i18n/comparator';
import SearchBar from './SearchBar';
import { FlagRound } from './Flags';

/* Rôles « staff » — dupliqués ici volontairement : `lib/auth/roles` importe le
   client Supabase SERVEUR (next/headers) et casserait le bundle client. */
const STAFF_ROLES = new Set(['owner', 'admin', 'editor', 'moderator', 'analyst']);

interface HeaderProfile {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  staff: boolean;
}

/**
 * En-tête public — UNE capsule unique, tout sur une ligne.
 *
 *  1. Barre supérieure fine, FERMABLE (un message clé) — disparaît au scroll,
 *     se souvient de la fermeture (localStorage).
 *  2. Capsule : logo · recherche (prend l'espace) · nav (actif en
 *     `.control--active`, repris du journal) · langue ronde · zone de session
 *     (déconnecté = Connexion + Commencer ; connecté = avatar rond de profil
 *     ouvrant un menu Mon journal / Préférences / Admin (staff) / Déconnexion).
 *
 * La capsule est posée sur le RELIEF 3D des cartes du journal (tokens `--elev`),
 * pas de liquid glass. Seule la barre de recherche est une surface creusée
 * (inset). Système Tradawave (violet-magenta). Drapeaux en SVG.
 */

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

/** Entrées du menu profil (hors « Déconnexion », qui est une action serveur). */
function profileLinks(l: Locale, staff: boolean) {
  const items = [
    { label: l === 'fr' ? 'Mon journal' : 'My journal', href: '/app', Icon: BookOpen },
    { label: l === 'fr' ? 'Préférences' : 'Preferences', href: '/settings', Icon: Settings },
  ];
  if (staff) items.push({ label: 'Admin', href: '/admin', Icon: LayoutDashboard });
  return items;
}

/** Avatar rond : photo de profil, ou initiales sur fond de marque (comme le dashboard). */
function Avatar({ profile }: { profile: HeaderProfile }) {
  const [broken, setBroken] = useState(false);
  if (profile.avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="pub-avatar-img" src={profile.avatarUrl} alt="" aria-hidden="true" onError={() => setBroken(true)} />
    );
  }
  return <span className="pub-avatar-txt" aria-hidden="true">{profile.initials}</span>;
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
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [topDismissed, setTopDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const profRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();
    let on = true;

    const loadProfile = async (user: { id: string; email?: string | null }) => {
      const { data } = await sb
        .from('profiles')
        .select('display_name, avatar_url, role')
        .eq('id', user.id)
        .single<{ display_name: string | null; avatar_url: string | null; role: string }>();
      if (!on) return;
      const name = data?.display_name ?? user.email?.split('@')[0] ?? 'Trader';
      setProfile({
        name,
        email: user.email ?? '',
        initials: name.trim().slice(0, 2).toUpperCase(),
        avatarUrl: data?.avatar_url ?? null,
        staff: data ? STAFF_ROLES.has(data.role) : false,
      });
    };

    const apply = (user: { id: string; email?: string | null } | null | undefined) => {
      if (!on) return;
      setAuthed(!!user);
      if (user) loadProfile(user);
      else setProfile(null);
    };

    sb.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => apply(s?.user));
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

  // Recherche : ⌘K / Ctrl+K ouvre le popup, Échap le ferme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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

  useEffect(() => {
    if (!profOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!profRef.current?.contains(e.target as Node)) setProfOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setProfOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [profOpen]);

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
  const startHref = '/signup';
  const startLabel = l === 'fr' ? 'Commencer' : 'Get started';
  const signinLabel = l === 'fr' ? 'Connexion' : 'Sign in';
  const logoutLabel = l === 'fr' ? 'Déconnexion' : 'Sign out';
  const menu = profile ? profileLinks(l, profile.staff) : [];
  const topMsg = l === 'fr' ? 'Données vérifiées à la source et datées.' : 'Data verified at source and dated.';

  // Le comparateur affiche désormais le header du site (navigation cohérente).
  // Sa coquille plein écran passe sous le header via `.pub-shell:has(.cmp-app)`
  // (CSS pur : flex-colonne, header dans le flux, `.cmp-app` remplit le reste).

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

        {/* UNE seule capsule : tout sur une ligne. Fond uni dès qu'on scrolle
            (sinon transparent sur le hero — le contenu passerait derrière). */}
        <header className={`pub-header${scrolled ? ' is-scrolled' : ''}`}>
          <Link href={`/${l}`} className="pub-brand" aria-label="Tradegrape">
            <Logo />
          </Link>

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
            <button
              type="button"
              className="pub-search-btn"
              aria-label={l === 'fr' ? 'Rechercher' : 'Search'}
              onClick={() => setSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

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
              <>
                <Link href="/login" className="control control--sm pub-signin">
                  {signinLabel}
                </Link>
                <Link href={startHref} className="control control--sm control--primary pub-cta">
                  {startLabel}
                </Link>
              </>
            ) : (
              <div className="pub-prof" ref={profRef}>
                <button
                  type="button"
                  className="pub-avatar"
                  aria-haspopup="menu"
                  aria-expanded={profOpen}
                  aria-label={profile?.name ?? 'Profil'}
                  onClick={() => setProfOpen((o) => !o)}
                >
                  {profile ? <Avatar profile={profile} /> : null}
                </button>
                {profOpen && profile ? (
                  <div className="pub-prof-pop" role="menu">
                    <div className="pub-prof-head">
                      <span className="pub-prof-avatar">
                        <Avatar profile={profile} />
                      </span>
                      <div className="pub-prof-id">
                        <span className="pub-prof-name">{profile.name}</span>
                        {profile.email ? <span className="pub-prof-email">{profile.email}</span> : null}
                      </div>
                    </div>
                    <div className="pub-prof-list">
                      {menu.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          className="pub-prof-item"
                          role="menuitem"
                          onClick={() => setProfOpen(false)}
                        >
                          <m.Icon size={17} aria-hidden="true" />
                          {m.label}
                        </Link>
                      ))}
                    </div>
                    <div className="pub-prof-sep" />
                    <form action={signout}>
                      <button type="submit" className="pub-prof-item pub-prof-out" role="menuitem">
                        <LogOut size={17} aria-hidden="true" />
                        {logoutLabel}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            )}

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
            <>
              <Link href="/login" className="control pub-drawer-signin" onClick={() => setDrawer(false)}>
                {signinLabel}
              </Link>
              <Link href={startHref} className="control control--primary pub-drawer-cta" onClick={() => setDrawer(false)}>
                {startLabel}
              </Link>
            </>
          ) : (
            <>
              {menu.map((m) => (
                <Link key={m.href} href={m.href} className="pub-drawer-link" onClick={() => setDrawer(false)}>
                  {m.label}
                </Link>
              ))}
              <form action={signout}>
                <button type="submit" className="control pub-drawer-signin" style={{ width: '100%' }}>
                  {logoutLabel}
                </button>
              </form>
            </>
          )}
        </nav>
      </div>

      {/* Popup de recherche design (icône → overlay verre centré). */}
      {searchOpen ? (
        <div
          className="pub-search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={l === 'fr' ? 'Rechercher une prop firm' : 'Search a prop firm'}
        >
          <div className="pub-search-scrim" onClick={() => setSearchOpen(false)} />
          <div className="pub-search-modal">
            <SearchBar locale={l} variant="modal" onNavigate={() => setSearchOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
