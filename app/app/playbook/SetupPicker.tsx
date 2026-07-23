'use client';

import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';

/**
 * Menu déroulant vers les setups prédéfinis à documenter. Aucun nom libre :
 * on choisit un tag `setup:` existant, et on ouvre sa page de définition.
 */
export default function SetupPicker({
  options,
}: {
  options: { key: string; label: string }[];
}) {
  const router = useRouter();
  if (options.length === 0) {
    return <p className="jsub">Tous les setups sont documentés.</p>;
  }
  return (
    <Select
      label="Choisir un setup"
      width="md"
      placeholder="Choisir un setup…"
      onChange={(v) => router.push(`/app/playbook/${v}`)}
      options={options.map((o) => ({ value: o.key, label: o.label }))}
    />
  );
}
