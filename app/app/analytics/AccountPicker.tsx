'use client';

import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';

/** Sélecteur de compte : « Tous les comptes » (agrégé) ou un compte précis. */
export default function AccountPicker({
  accounts,
  value,
}: {
  accounts: { id: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <Select
      label="Compte"
      value={value}
      width="md"
      onChange={(v) => router.push(v === 'all' ? '/app/analytics' : `/app/accounts/${v}?view=analytics`)}
      options={[{ value: 'all', label: 'Tous les comptes' }, ...accounts.map((a) => ({ value: a.id, label: a.label }))]}
    />
  );
}
