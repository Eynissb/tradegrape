'use client';

import {
  Wallet,
  LineChart,
  Scale,
  NotebookPen,
  BookMarked,
  GitCompare,
  CalendarClock,
  Settings,
  ShieldCheck,
  CircleHelp,
} from 'lucide-react';
import SideNav, { type SideNavItem } from '@/components/ui/SideNav';

/** Navigation du journal. Le châssis vient de `SideNav` — ici, que des liens. */
export default function AppSidebar({ staff }: { staff: boolean }) {
  const nav: SideNavItem[] = [
    { href: '/app', label: 'Mes comptes', icon: Wallet, match: (p) => p === '/app' || p.startsWith('/app/accounts') },
    { href: '/app/analytics', label: 'Analytics', icon: LineChart, match: (p) => p.startsWith('/app/analytics') },
    { href: '/app/balance', label: 'Bilan financier', icon: Scale, match: (p) => p.startsWith('/app/balance') },
    { href: '/app/notebook', label: 'Notebook', icon: NotebookPen, match: (p) => p.startsWith('/app/notebook') },
    { href: '/app/playbook', label: 'Playbook', icon: BookMarked, match: (p) => p.startsWith('/app/playbook') },
  ];
  const tools: SideNavItem[] = [
    { label: 'Comparateur', icon: GitCompare, disabled: true, note: 'Bientôt' },
    { label: 'Calendrier économique', icon: CalendarClock, disabled: true, note: 'Bientôt' },
  ];
  const foot: SideNavItem[] = [
    { label: 'Aide', icon: CircleHelp, disabled: true, note: 'Bientôt' },
    { href: '/settings', label: 'Préférences', icon: Settings },
    ...(staff
      ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck, match: (p: string) => p.startsWith('/admin') }]
      : []),
  ];

  return (
    <SideNav
      brandHref="/app"
      brandAriaLabel="Tradegrape — mes comptes"
      groups={[
        { title: 'Navigation', items: nav },
        { title: 'Outils', items: tools },
      ]}
      foot={foot}
    />
  );
}
