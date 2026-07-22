'use client';

import { useActionState, useEffect, useState } from 'react';
import { FileUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { money, pnlColor, signed } from '@/app/app/_components/journal-ui';
import { ADAPTERS } from '@/lib/journal/trade-csv';
import { applyTradesImport, previewTradesImport, type PreviewState } from './import-actions';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const INITIAL: PreviewState = { ok: false };

/* En-tête et lignes sont deux grilles distinctes : colonnes déterministes. */
const COLS_PREVIEW = '116px minmax(0,1fr) 120px';

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
  const [commTotal, setCommTotal] = useState('');

  // Préremplit le total depuis le taux enregistré du compte, quand un aperçu arrive.
  useEffect(() => {
    if (state.ok && state.accountRate && state.contracts) {
      setCommTotal(String(round2(state.contracts * state.accountRate)));
    } else if (state.ok) {
      setCommTotal('');
    }
  }, [state]);

  const gross = state.grossPnl ?? 0;
  const commValue = commTotal.trim() === '' ? 0 : Number(commTotal.replace(',', '.')) || 0;
  const net = round2(gross - commValue);
  // Le fichier ne portait pas de frais → on propose la saisie des commissions.
  const askCommissions = state.ok && (state.fileFees ?? 0) === 0;

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

      {/* État transitoire — analyse en cours. Sans lui, seul le libellé du
          bouton changeait : rien n'annonçait le récapitulatif à venir. */}
      {pending ? (
        <div className="card" aria-busy="true" aria-live="polite">
          <span className="sr-only">Analyse du fichier en cours…</span>
          <div className="skeleton" style={{ height: 22, width: '38%' }} />
          <div className="skeleton mt-3" style={{ height: 14, width: '62%' }} />
          <div className="jimport-skel mt-4">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
          </div>
        </div>
      ) : null}

      {/* Étape 2 — récap avant application */}
      {state.ok ? (
        <div className="card">
          <h2 className="admin-h2">Récapitulatif</h2>
          <p className="admin-sub mt-1">
            <span className="num" style={{ color: 'var(--win)' }}>{state.createCount}</span> trade(s) à importer
            {state.invalidCount ? (
              <>
                {' · '}
                <span className="num" style={{ color: 'var(--loss)' }}>{state.invalidCount}</span> ligne(s) en erreur (ignorées)
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
            <div className="table-scroll mt-4">
              <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_PREVIEW }}>
                <div className="data-head" role="row">
                  <span role="columnheader">Date</span>
                  <span role="columnheader">Symbole</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>P&L</span>
                </div>
                {state.lines.map((l, i) => (
                  <div key={i} className="data-row" role="row">
                    <span role="cell" className="num">{l.trade_date}</span>
                    <span role="cell">{l.symbol}</span>
                    <span role="cell" className="num" style={{ textAlign: 'right', color: pnlColor(l.pnl) }}>{signed(l.pnl, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {state.createCount && state.createCount > (state.lines?.length ?? 0) ? (
            <p className="jsub mt-2">Aperçu des {state.lines?.length} premières lignes · {state.createCount} au total.</p>
          ) : null}

          {/* Étape commissions — le fichier ne porte pas les frais */}
          {askCommissions ? (
            <div className="jimport-comm mt-5">
              <h3 className="acct-rules-title">Commissions</h3>
              <p className="jsub" style={{ marginBottom: '1rem' }}>
                Cet export {ADAPTERS[platform].label} ne contient pas les frais et le P&L est brut.
                Saisis le <strong>total des commissions</strong> affiché par ta plateforme pour cette
                période ({state.contracts} contrat(s) importé(s)) — on le répartit sur les trades et on
                retient le taux par contrat pour tes prochains imports.
              </p>

              <Input
                id="comm_total"
                label={`Total des commissions (${currency})`}
                type="number"
                step="0.01"
                min="0"
                width="sm"
                mono
                value={commTotal}
                onChange={(e) => setCommTotal(e.target.value)}
                placeholder="ex : 14.56"
              />
              {state.accountRate ? (
                <p className="jsub mt-1">
                  Taux enregistré : <span className="num">{state.accountRate}</span> {currency}/contrat aller-retour (prérempli).
                </p>
              ) : null}

              <div className="jimport-summary mt-3">
                <span>Brut <b className="num" style={{ color: pnlColor(gross) }}>{signed(gross, currency)}</b></span>
                <span>Commissions <b className="num" style={{ color: commValue ? 'var(--loss)' : 'var(--ink3)' }}>−{money(commValue, currency)}</b></span>
                <span>Net <b className="num" style={{ color: pnlColor(net) }}>{signed(net, currency)}</b></span>
              </div>
              <p className="jsub mt-1">Vérifie que le net correspond au chiffre de ta plateforme.</p>

              {commTotal.trim() === '' ? (
                <div className="notice notice-warn mt-3">
                  Sans commissions, le P&L et la progression vers l’objectif seront <strong>surestimés</strong>.
                  Tu pourras les renseigner plus tard dans les paramètres du compte.
                </div>
              ) : null}
            </div>
          ) : (state.fileFees ?? 0) > 0 ? (
            <p className="jsub mt-4">Frais lus dans le fichier : <span className="num">{money(state.fileFees ?? 0, currency)}</span>.</p>
          ) : null}

          {state.createCount && state.createCount > 0 ? (
            <form action={applyTradesImport} className="mt-5">
              <input type="hidden" name="account_id" value={state.accountId} />
              <input type="hidden" name="rows" value={state.rowsJson} />
              <input type="hidden" name="platform" value={state.platform} />
              {askCommissions ? <input type="hidden" name="total_commissions" value={commTotal} /> : null}
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
