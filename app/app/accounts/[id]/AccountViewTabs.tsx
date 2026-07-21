'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, ListOrdered } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';

/**
 * Onglets de l'espace de travail de la page compte (architecture B).
 * Navigation par URL (?view=…) → le contenu reste rendu côté serveur.
 * Les onglets Analytics / Ailleurs / Revue s'ajouteront ici (tranche 2/3).
 */
export default function AccountViewTabs({
  accountId,
  view,
}: {
  accountId: string;
  view: string;
}) {
  const router = useRouter();
  return (
    <Tabs
      tabs={[
        { id: 'calendrier', label: 'Calendrier', icon: CalendarDays },
        { id: 'historique', label: 'Historique', icon: ListOrdered },
      ]}
      active={view}
      onChange={(id) => router.push(`/app/accounts/${accountId}?view=${id}`)}
      ariaLabel="Vues du compte"
    />
  );
}
