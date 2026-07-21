'use client';

import { useActionState, useState } from 'react';
import { FileUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { pnlColor, signed } from '@/app/app/_components/journal-ui';
import { ADAPTERS } from '@/lib/journal/trade-csv';
import { applyTradesImport, previewTradesImport, type PreviewState } from './import-actions';

const INITIAL: PreviewState = { ok: false };

const PLATFORM_OPTIONS = (Object.keys(ADAPTERS) as (keyof typeof ADAPTERS)[]).map((k) => ({
  value: k,
  label: ADAPTERS[k].label,
}));

export default function ImportTradesClient({
  accountId,
  currency,
}: {
  accountId: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(previewTradesImport, INITIAL);
  const [fileName, setFileName] = useState('');
  const [platform, setPlatform] = useState<keyof typeof ADAPTERS>('tradovate');

  return (
    <div className="flex flex-col gap-6">
      {/* Étape 1 — plateforme + fichier */}
      <form action={formAction} className="card ds-form">
        <input type="hidden" name="account_id" value={accountId} />

        <Select
          name="platform"
          label="Plateforme"
          value={platform}
          onChange={(v) => setPlatform(v as keyof typeof ADAPTERS)}
          options={PLATFORM_OPTIONS}
          width="sm"
        />
        <p className="jsub mt-2" style={{ marginBottom: '1rem' }}>
          Colonnes attendues : <span className="num">{ADAPTERS[platform].expected}</span>
        </p>

        <span className="label" style={{ display: 'block', marginBottom: '.45rem' }}>Fichier CSV</span>
        <label className={cn('dropzone', fileName && 'has-file')}>
          <input
            className="dropzone-input"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
          <span className="icon-tile" aria-hidden="true"><FileUp /></span>
          <span className="dropzone-label">{fileName || 'Choisir un fichier CSV ou glisser-déposer'}</span>
        </label>

        <Button type="submit" loading={pending} className="mt-4">
          {pending ? 'Analyse…' : 'Analyser le fichier'}
        </Button>
      </form>

      {state.error ? <div className="notice notice-error">{state.error}</div> : null}

      {/* Étape 2 — récap avant application */}
      {state.ok ? (
        <div className="card">
          <h2 className="admin-h2">Récapitulatif</h2>
          <p className="admin-sub mt-1">
            <span className="num" style={{ color: 'var(--ok)' }}>{state.createCount}</span> trade(s) à importer
            {state.invalidCount ? (
              <>
                {' · '}
                <span className="num" style={{ color: 'var(--danger)' }}>{state.invalidCount}</span> ligne(s) en erreur (ignorées)
              </>
            ) : null}
          </p>

          {state.invalid && state.invalid.length > 0 ? (
            <div className="notice notice-error mt-4">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {state.invalid.map((e, i) => <li key={i}>{e}</li>)}
                {state.invalidCount && state.invalidCount > state.invalid.length ? <li>…</li> : null}
              </ul>
            </div>
          ) : null}

          {state.lines && state.lines.length > 0 ? (
            <div className="table-wrap mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbole</th>
                    <th className="num">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {state.lines.map((l, i) => (
                    <tr key={i}>
                      <td data-label="Date" className="num">{l.trade_date}</td>
                      <td data-label="Symbole">{l.symbol}</td>
                      <td data-label="P&L" className="num" style={{ color: pnlColor(l.pnl) }}>{signed(l.pnl, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {state.createCount && state.createCount > (state.lines?.length ?? 0) ? (
            <p className="jsub mt-2">Aperçu des {state.lines?.length} premières lignes · {state.createCount} au total.</p>
          ) : null}

          {state.createCount && state.createCount > 0 ? (
            <form action={applyTradesImport} className="mt-5">
              <input type="hidden" name="account_id" value={state.accountId} />
              <input type="hidden" name="rows" value={state.rowsJson} />
              <Button type="submit">Importer {state.createCount} trade(s)</Button>
            </form>
          ) : (
            <div className="notice notice-info mt-4">Aucun trade valide à importer.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
