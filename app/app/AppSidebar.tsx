'use client';

import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  LineChart,
  ClipboardCheck,
  Target,
  FileText,
  NotebookPen,
  BookMarked,
  GitCompare,
  Settings,
  ShieldCheck,
  CircleHelp,
} from 'lucide-react';
import SideNav, { type SideNavItem } from '@/components/ui/SideNav';
import { comparatorHref } from '@/lib/i18n/comparator';

/**
 * Navigation du journal — structure alignée sur les journaux de référence
 * (Edgely) mais fidèle à NOS données : nos comptes sont des comptes prop firm,
 * la journalisation vit dans la page compte. Trois blocs lisibles :
 *   • Piloter   — vue d'ensemble, comptes, journal, analytics
 *   • Progresser — revues de session, discipline, rapports
 *   • Carnet    — notes libres, playbook de setups
 * Le châssis vient de `SideNav` — ici, que des liens.
 */
export default function AppSidebar({ staff }: { staff: boolean }) {
  const piloter: SideNavItem[] = [
    { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard, match: (p) => p === '/app' },
    { href: '/app/accounts', label: 'Comptes', icon: Wallet, match: (p) => p.startsWith('/app/accounts') },
    { href: '/app/journal', label: 'Journal', icon: CalendarDays, match: (p) => p.startsWith('/app/journal') },
    { href: '/app/analytics', label: 'Analytics', icon: LineChart, match: (p) => p.startsWith('/app/analytics') },
  ];
  const progresser: SideNavItem[] = [
    { href: '/app/sessions', label: 'Sessions', icon: ClipboardCheck, match: (p) => p.startsWith('/app/sessions') },
    { href: '/app/discipline', label: 'Discipline', icon: Target, match: (p) => p.startsWith('/app/discipline') },
    { href: '/app/balance', label: 'Rapports', icon: FileText, match: (p) => p.startsWith('/app/balance') || p.startsWith('/app/reports') },
  ];
  const carnet: SideNavItem[] = [
    { href: '/app/notebook', label: 'Notebook', icon: NotebookPen, match: (p) => p.startsWith('/app/notebook') },
    { href: '/app/playbook', label: 'Playbook', icon: BookMarked, match: (p) => p.startsWith('/app/playbook') },
  ];
  const foot: SideNavItem[] = [
    { href: comparatorHref('fr'), label: 'Comparateur', icon: GitCompare },
    { href: '/settings', label: 'Préférences', icon: Settings },
    ...(staff
      ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck, match: (p: string) => p.startsWith('/admin') }]
      : []),
    { label: 'Aide', icon: CircleHelp, disabled: true, note: 'Bientôt' },
  ];

  return (
    <SideNav
      brandHref="/app"
      brandAriaLabel="Tradegrape — tableau de bord"
      groups={[
        { title: 'Piloter', items: piloter },
        { title: 'Progresser', items: progresser },
        { title: 'Carnet', items: carnet },
      ]}
      foot={foot}
    />
  );
}
