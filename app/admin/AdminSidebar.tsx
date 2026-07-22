'use client';

import {
  LayoutDashboard,
  Building2,
  Layers,
  Tags,
  FileUp,
  Inbox,
  ArrowLeft,
} from 'lucide-react';
import SideNav, { type SideNavItem } from '@/components/ui/SideNav';

/**
 * Navigation du back-office. Le châssis vient de `SideNav` — ici, que des liens.
 *
 * Plans, Offres et Import CSV n'ont pas encore de page d'index (on n'y accède
 * qu'à travers une firm, et `/admin/offers/import` exige un `?plan=`) : les
 * lier produirait des 404. Ils suivent donc la convention « à venir » de la
 * sidebar du journal — même style désactivé, même badge.
 */
export default function AdminSidebar() {
  const nav: SideNavItem[] = [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/admin/firms', label: 'Firms', icon: Building2, match: (p) => p.startsWith('/admin/firms') },
    { href: '/admin/requested-firms', label: 'Firms demandées', icon: Inbox, match: (p) => p.startsWith('/admin/requested-firms') },
  ];
  const catalogue: SideNavItem[] = [
    { label: 'Plans', icon: Layers, disabled: true, note: 'Bientôt' },
    { label: 'Offres', icon: Tags, disabled: true, note: 'Bientôt' },
    { label: 'Import CSV', icon: FileUp, disabled: true, note: 'Bientôt' },
  ];
  const foot: SideNavItem[] = [
    { href: '/app', label: 'Retour à l’app', icon: ArrowLeft },
  ];

  return (
    <SideNav
      brandHref="/admin"
      brandAriaLabel="Tradegrape — back-office"
      pill="admin"
      groups={[
        { title: 'Navigation', items: nav },
        { title: 'Catalogue', items: catalogue },
      ]}
      foot={foot}
    />
  );
}
