'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  LineChart,
  Scale,
  GitCompare,
  CalendarClock,
  Settings,
  ShieldCheck,
  CircleHelp,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { signout } from '@/app/(auth)/actions';

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  match?: (p: string) => boolean;
}

function Item({ it, active }: { it: NavItem; active: boolean }) {
  const Icon = it.icon;
  const body = (
    <>
      <Icon aria-hidden="true" />
      <span className="app-side-label">{it.label}</span>
      {it.soon ? <span className="app-side-soon">Bientôt</span> : null}
    </>
  );
  if (it.soon || !it.href) return <span className="app-side-item is-soon">{body}</span>;
  return (
    <Link href={it.href} className={`app-side-item${active ? ' is-active' : ''}`}>
      {body}
    </Link>
  );
}

export default function AppSidebar({ staff }: { staff: boolean }) {
  const path = usePathname();
  const on = (it: NavItem) => (it.href ? (it.match ? it.match(path) : path === it.href) : false);

  const nav: NavItem[] = [
    { href: '/app', label: 'Mes comptes', icon: Wallet, match: (p) => p === '/app' || p.startsWith('/app/accounts') },
    { href: '/app/analytics', label: 'Analytics', icon: LineChart, match: (p) => p.startsWith('/app/analytics') },
    { href: '/app/balance', label: 'Bilan financier', icon: Scale, match: (p) => p.startsWith('/app/balance') },
  ];
  const tools: NavItem[] = [
    { label: 'Comparateur', icon: GitCompare, soon: true },
    { label: 'Calendrier économique', icon: CalendarClock, soon: true },
  ];

  return (
    <aside className="app-side">
      <Link href="/app" className="app-side-logo" aria-label="Tradegrape — mes comptes">
        <Image src="/brand/logo.png" alt="Tradegrape" width={132} height={33} priority />
      </Link>

      <nav className="app-side-nav">
        <p className="app-side-group">Navigation</p>
        {nav.map((it) => <Item key={it.label} it={it} active={on(it)} />)}

        <p className="app-side-group">Outils</p>
        {tools.map((it) => <Item key={it.label} it={it} active={false} />)}
      </nav>

      <div className="app-side-foot">
        <Item it={{ label: 'Aide', icon: CircleHelp, soon: true }} active={false} />
        <Item it={{ href: '/settings', label: 'Préférences', icon: Settings }} active={path === '/settings'} />
        {staff ? (
          <Item it={{ href: '/admin', label: 'Admin', icon: ShieldCheck, match: (p) => p.startsWith('/admin') }} active={path.startsWith('/admin')} />
        ) : null}
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
