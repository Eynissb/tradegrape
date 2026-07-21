'use client';

import { useActionState, useState } from 'react';
import { FileUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { applyImport, previewImport, type PreviewState } from './import-actions';

const INITIAL: PreviewState = { ok: false };

export default function ImportClient({ planId }: { planId: string }) {
  const [state, formAction, pending] = useActionState(previewImport, INITIAL);
  const [fileName, setFileName] = useState('');

  return (
    <div className="flex flex-col gap-6">
      {/* Étape 1 — choix du fichier */}
      <form action={formAction} className="card ds-form">
        <input type="hidden" name="plan_id" value={planId} />
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
          <span className="dropzone-label">
            {fileName || 'Choisir un fichier CSV ou glisser-déposer'}
          </span>
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
            <span className="num" style={{ color: 'var(--ok)' }}>{state.createCount}</span> à créer ·{' '}
            <span className="num" style={{ color: 'var(--warn)' }}>{state.updateCount}</span> à mettre à jour
            {state.invalid && state.invalid.length > 0 ? (
              <>
                {' · '}
                <span className="num" style={{ color: 'var(--danger)' }}>{state.invalid.length}</span>{' '}
                ligne(s) en erreur (ignorées)
              </>
            ) : null}
          </p>

          {state.invalid && state.invalid.length > 0 ? (
            <div className="notice notice-error mt-4">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {state.invalid.slice(0, 8).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {state.invalid.length > 8 ? <li>…</li> : null}
              </ul>
            </div>
          ) : null}

          {state.lines && state.lines.length > 0 ? (
            <div className="table-wrap mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th className="num">Taille</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.lines.map((l, i) => (
                    <tr key={i}>
                      <td data-label="Taille" className="num">{l.account_size.toLocaleString('fr-FR')}</td>
                      <td data-label="Action">
                        <Badge variant={l.action === 'create' ? 'ok' : 'warn'}>
                          {l.action === 'create' ? 'création' : 'mise à jour'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notice notice-info mt-4">Aucune ligne valide à importer.</div>
          )}

          {state.lines && state.lines.length > 0 ? (
            <form action={applyImport} className="mt-5">
              <input type="hidden" name="plan_id" value={state.planId} />
              <input type="hidden" name="rows" value={state.rowsJson} />
              <Button type="submit">
                Appliquer {state.lines.length} changement(s)
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
