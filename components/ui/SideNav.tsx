'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { signout } from '@/app/(auth)/actions';

export interface SideNavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** Item non cliquable : soit à venir, soit accessible seulement par ailleurs. */
  disabled?: boolean;
  /** Pastille de droite (« Bientôt », « via une firm »…). */
  note?: string;
  /** Règle d'activation ; par défaut égalité stricte avec le chemin. */
  match?: (path: string) => boolean;
}

export interface SideNavGroup {
  title?: string;
  items: SideNavItem[];
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
  const isOn = (it: SideNavItem) =>
    it.href ? (it.match ? it.match(path) : path === it.href) : false;

  return (
    <aside className="app-side">
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
  );
}
