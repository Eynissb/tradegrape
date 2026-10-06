'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Select from '@/components/ui/Select';
import type { PeriodPreset } from '@/lib/journal/analytics';

/**
 * Sélecteur de période du tableau de bord — UN seul menu compact (réf. Edgely),
 * au lieu des 4 onglets. Écrit ?period=… en préservant compte + mois du calendrier.
 */
const OPTIONS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'all', label: 'Depuis le début' },
];

export default function DashPeriodFilter({ value }: { value: PeriodPreset }) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = OPTIONS.some((o) => o.value === value) ? value : 'all';

  return (
    <Select
      ariaLabel="Période"
      value={current}
      width="sm"
      onChange={(v) => {
        const params = new URLSearchParams(sp.toString());
        params.set('period', v);
        params.delete('from');
        params.delete('to');
        router.push(`/app?${params.toString()}`);
      }}
      options={OPTIONS}
    />
  );
}
