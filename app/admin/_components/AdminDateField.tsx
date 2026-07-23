'use client';

import { useState } from 'react';
import DatePicker from '@/components/ui/DatePicker';

function todayStr(): string {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Champ date pour les formulaires admin (server actions) : DatePicker contrôlé
 * + raccourci « Aujourd'hui » et « Effacer ». Soumet via un input caché `name`.
 */
export default function AdminDateField({
  name,
  label,
  defaultValue = '',
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  return (
    <div className="admin-datefield">
      <DatePicker name={name} label={label} value={value} onChange={setValue} hint={hint} width="sm" />
      <div className="admin-datefield-quick">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue(todayStr())}>
          Aujourd’hui
        </button>
        {value ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue('')}>
            Effacer
          </button>
        ) : null}
      </div>
    </div>
  );
}
