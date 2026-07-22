'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Tabs from '@/components/ui/Tabs';
import DatePicker from '@/components/ui/DatePicker';
import Button from '@/components/ui/Button';
import type { PeriodPreset } from '@/lib/journal/analytics';

/**
 * Sélecteur de période des analytics. Pilote l'URL (?period=…) → tout est
 * recalculé côté serveur. La période personnalisée ouvre deux sélecteurs de date.
 */
export default function AnalyticsControls({
  basePath,
  baseParams,
  preset,
  from,
  to,
}: {
  /** Chemin cible, ex. « /app/analytics » ou « /app/accounts/<id> ». */
  basePath: string;
  /**
   * Paramètres d'URL constants à reconduire, ex. `{ view: 'analytics' }`.
   * Données PURES, jamais une fonction : ce composant est un Client Component
   * et React ne peut pas sérialiser une closure passée depuis le serveur.
   */
  baseParams?: Record<string, string>;
  preset: PeriodPreset;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [custom, setCustom] = useState(preset === 'custom');
  const [cFrom, setCFrom] = useState(from);
  const [cTo, setCTo] = useState(to);

  function go(period: PeriodPreset, extra?: Record<string, string>) {
    const params = new URLSearchParams(baseParams);
    params.set('period', period);
    for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="acct2-period">
      <Tabs
        tabs={[
          { id: 'month', label: 'Ce mois' },
          { id: 'quarter', label: 'Ce trimestre' },
          { id: 'all', label: 'Depuis le début' },
          { id: 'custom', label: 'Personnalisé' },
        ]}
        active={preset}
        onChange={(id) => {
          if (id === 'custom') {
            setCustom(true);
          } else {
            setCustom(false);
            go(id as PeriodPreset);
          }
        }}
        ariaLabel="Période des analytics"
      />

      {custom ? (
        <div className="acct2-period-custom">
          <DatePicker id="from" label="Du" value={cFrom} onChange={setCFrom} />
          <DatePicker id="to" label="Au" value={cTo} onChange={setCTo} />
          <Button
            type="button"
            size="sm"
            disabled={!cFrom || !cTo || cFrom > cTo}
            onClick={() => go('custom', { from: cFrom, to: cTo })}
          >
            Appliquer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
