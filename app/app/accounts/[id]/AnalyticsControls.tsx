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
  accountId,
  preset,
  from,
  to,
  buildHref,
}: {
  accountId?: string;
  preset: PeriodPreset;
  from: string;
  to: string;
  /** Override du lien (vue agrégée). Par défaut : l'onglet Analytics du compte. */
  buildHref?: (period: PeriodPreset, extra: string) => string;
}) {
  const router = useRouter();
  const [custom, setCustom] = useState(preset === 'custom');
  const [cFrom, setCFrom] = useState(from);
  const [cTo, setCTo] = useState(to);

  function go(period: PeriodPreset, extra = '') {
    const href = buildHref
      ? buildHref(period, extra)
      : `/app/accounts/${accountId}?view=analytics&period=${period}${extra}`;
    router.push(href);
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
            onClick={() => go('custom', `&from=${cFrom}&to=${cTo}`)}
          >
            Appliquer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
