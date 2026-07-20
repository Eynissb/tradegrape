'use client';

import { useActionState } from 'react';
import {
  applyImport,
  previewImport,
  type PreviewState,
} from './import-actions';

const INITIAL: PreviewState = { ok: false };

export default function ImportClient({ planId }: { planId: string }) {
  const [state, formAction, pending] = useActionState(previewImport, INITIAL);

  return (
    <div className="flex flex-col gap-6">
      {/* Étape 1 — choix du fichier */}
      <form action={formAction} className="admin-section">
        <input type="hidden" name="plan_id" value={planId} />
        <div className="field">
          <label htmlFor="file">Fichier CSV</label>
          <input className="input" id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <button type="submit" className="btn-grad mt-4" disabled={pending}>
          {pending ? 'Analyse…' : 'Analyser le fichier'}
        </button>
      </form>

      {state.error ? <div className="notice notice-error">{state.error}</div> : null}

      {/* Étape 2 — récap avant application */}
      {state.ok ? (
        <div className="admin-section">
          <legend className="admin-h2" style={{ padding: 0 }}>
            Récapitulatif
          </legend>
          <p className="admin-sub mt-1">
            <span className="num" style={{ color: 'var(--lime)' }}>
              {state.createCount}
            </span>{' '}
            à créer ·{' '}
            <span className="num" style={{ color: 'var(--amber)' }}>
              {state.updateCount}
            </span>{' '}
            à mettre à jour
            {state.invalid && state.invalid.length > 0 ? (
              <>
                {' · '}
                <span className="num" style={{ color: 'var(--red)' }}>
                  {state.invalid.length}
                </span>{' '}
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
            <div className="admin-table-wrap mt-4">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Taille</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="admin-strong num">
                        {l.account_size.toLocaleString('fr-FR')}
                      </td>
                      <td>
                        <span className={l.action === 'create' ? 'admin-badge is-on' : 'admin-badge'}>
                          {l.action === 'create' ? 'création' : 'mise à jour'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notice notice-info mt-4">
              Aucune ligne valide à importer.
            </div>
          )}

          {state.lines && state.lines.length > 0 ? (
            <form action={applyImport} className="mt-5">
              <input type="hidden" name="plan_id" value={state.planId} />
              <input type="hidden" name="rows" value={state.rowsJson} />
              <button type="submit" className="btn-grad">
                Appliquer {state.lines.length} changement(s)
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
