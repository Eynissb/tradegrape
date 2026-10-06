'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Rows3 } from 'lucide-react';
import Select from '@/components/ui/Select';
import type { PeriodPreset } from '@/lib/journal/analytics';

const PERIODS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'all', label: 'Depuis le début' },
];

/**
 * Barre d'outils du journal (réf. Edgely) : bascule Liste/Calendrier, période et
 * compte. Chaque contrôle ne modifie que sa clé d'URL, les autres sont préservées.
 */
export default function JournalControls({
  view,
  period,
  account,
  accounts,
}: {
  view: 'list' | 'calendar';
  period: PeriodPreset;
  account: string;
  accounts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const push = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    const qs = p.toString();
    router.push(qs ? `/app/journal?${qs}` : '/app/journal');
  };

  return (
    <>
      <div className="acct-viewtoggle" role="group" aria-label="Affichage">
        <button
          type="button"
          className={`acct-vt${view === 'list' ? ' is-active' : ''}`}
          aria-pressed={view === 'list'}
          aria-label="Vue liste"
          onClick={() => push((p) => p.delete('view'))}
        >
          <Rows3 size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`acct-vt${view === 'calendar' ? ' is-active' : ''}`}
          aria-pressed={view === 'calendar'}
          aria-label="Vue calendrier"
          onClick={() => push((p) => p.set('view', 'calendar'))}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
      </div>

      {view === 'list' ? (
        <Select
          ariaLabel="Période"
          value={PERIODS.some((o) => o.value === period) ? period : 'all'}
          width="sm"
          onChange={(v) => push((p) => { p.set('period', v); p.delete('from'); p.delete('to'); })}
          options={PERIODS}
        />
      ) : null}

      <Select
        ariaLabel="Compte"
        value={account}
        width="sm"
        onChange={(v) => push((p) => (v === 'all' ? p.delete('account') : p.set('account', v)))}
        options={[{ value: 'all', label: 'Tous les comptes' }, ...accounts.map((a) => ({ value: a.id, label: a.label }))]}
      />
    </>
  );
}
