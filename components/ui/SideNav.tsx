'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { signout } from '@/app/(auth)/actions';

export interface SideNavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** Item non cliquable (à venir). */
  disabled?: boolean;
  /** Pastille de droite — « Bientôt » par convention produit. */
  note?: string;
  /** Règle d'activation ; par défaut égalité stricte avec le chemin. */
  match?: (path: string) => boolean;
}

export interface SideNavGroup {
  title?: string;
  items: SideNavItem[];
}

/* ---------------------------------------------------------------------------
   État partagé entre le bouton de l'en-tête et le tiroir. Le bouton vit dans
   le header, la navigation dans le shell : il leur faut un état commun.
--------------------------------------------------------------------------- */
const SideNavCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
} | null>(null);

export function SideNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const value = useMemo(() => ({ open, setOpen, toggleRef }), [open]);
  return <SideNavCtx.Provider value={value}>{children}</SideNavCtx.Provider>;
}

function useSideNav() {
  const ctx = useContext(SideNavCtx);
  if (!ctx) throw new Error('SideNav doit être rendu dans <SideNavProvider>');
  return ctx;
}

/** Bouton d'ouverture du tiroir — à placer dans l'en-tête. Masqué au-delà du seuil. */
export function SideNavToggle() {
  const { open, setOpen, toggleRef } = useSideNav();
  return (
    <button
      ref={toggleRef}
      type="button"
      className="app-side-toggle"
      aria-label="Ouvrir la navigation"
      aria-expanded={open}
      aria-controls="sidenav"
      onClick={() => setOpen(!open)}
    >
      <Menu aria-hidden="true" />
    </button>
  );
}

function Item({ it, active }: { it: SideNavItem; active: boolean }) {
  const Icon = it.icon;
  const body = (
    <>
      <Icon aria-hidden="true" />
      <span className="app-side-label">{it.label}</span>
      {it.note ? <span className="app-side-soon">{it.note}</span> : null}
    </>
  );
  if (it.disabled || !it.href) {
    return <span className="app-side-item is-soon">{body}</span>;
  }
  return (
    <Link href={it.href} className={`app-side-item${active ? ' is-active' : ''}`}>
      {body}
    </Link>
  );
}

/**
 * Châssis UNIQUE de la navigation latérale — structure, largeur, en-tête de
 * marque, comportement responsive et styles. Le journal et le back-office ne
 * fournissent que leurs jeux de liens : une seule implémentation, deux
 * configurations. Ne pas dupliquer ce composant pour une nouvelle zone.
 *
 * Sous le seuil (860 px) la barre devient un TIROIR : elle se ferme au clic
 * sur le voile, à la touche Échap et à chaque navigation.
 */
export default function SideNav({
  brandHref,
  brandAriaLabel,
  pill,
  groups,
  foot,
}: {
  brandHref: string;
  brandAriaLabel: string;
  /** Mention à côté du logo (ex. « admin »). */
  pill?: string;
  groups: SideNavGroup[];
  foot?: SideNavItem[];
}) {
  const path = usePathname();
  const { open, setOpen, toggleRef } = useSideNav();
  const asideRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, [setOpen, toggleRef]);

  // Fermeture à la navigation : le chemin change → le tiroir se referme.
  useEffect(() => {
    setOpen(false);
  }, [path, setOpen]);

  // Échap ferme et rend le focus au bouton.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Le corps ne défile pas derrière le tiroir.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // À l'ouverture, le focus entre dans le tiroir (navigation au clavier).
  useEffect(() => {
    if (open) asideRef.current?.focus();
  }, [open]);

  const isOn = (it: SideNavItem) =>
    it.href ? (it.match ? it.match(path) : path === it.href) : false;

  return (
    <>
      {/* Voile — le clic extérieur ferme. */}
      <div
        className={`app-side-veil${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="sidenav"
        ref={asideRef}
        tabIndex={-1}
        className={`app-side${open ? ' is-open' : ''}`}
      >
        <Link href={brandHref} className="app-side-logo" aria-label={brandAriaLabel}>
          <Image src="/brand/logo.png" alt="Tradegrape" width={132} height={33} priority />
          {pill ? <span className="app-side-pill">{pill}</span> : null}
        </Link>

        <nav className="app-side-nav">
          {groups.map((g, gi) => (
            <div key={g.title ?? gi} className="app-side-group-block">
              {g.title ? <p className="app-side-group">{g.title}</p> : null}
              {g.items.map((it) => (
                <Item key={it.label} it={it} active={isOn(it)} />
              ))}
            </div>
          ))}
        </nav>

        <div className="app-side-foot">
          {foot?.map((it) => (
            <Item key={it.label} it={it} active={isOn(it)} />
          ))}
          <form action={signout}>
            <button type="submit" className="app-side-item app-side-signout">
              <LogOut aria-hidden="true" />
              <span className="app-side-label">Déconnexion</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
