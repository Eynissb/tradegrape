'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Select from '@/components/ui/Select';

/**
 * Filtre « Tous les comptes ▾ » du tableau de bord. Écrit ?account=… en
 * préservant la période et le mois du calendrier déjà dans l'URL.
 */
export default function DashAccountFilter({
  accounts,
  value,
}: {
  accounts: { id: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  return (
    <Select
      ariaLabel="Compte"
      value={value}
      width="sm"
      onChange={(v) => {
        const params = new URLSearchParams(sp.toString());
        if (v === 'all') params.delete('account');
        else params.set('account', v);
        const qs = params.toString();
        router.push(qs ? `/app?${qs}` : '/app');
      }}
      options={[{ value: 'all', label: 'Tous les comptes' }, ...accounts.map((a) => ({ value: a.id, label: a.label }))]}
    />
  );
}
