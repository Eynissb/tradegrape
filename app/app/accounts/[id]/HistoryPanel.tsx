'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import Button, { buttonClasses } from '@/components/ui/Button';
import { pnlColor, signed } from '@/app/app/_components/journal-ui';
import { tagLabel } from '@/lib/journal/tags';
import { ADAPTERS } from '@/lib/journal/trade-csv';
import { deleteImportBatch, deleteTradesBulk } from '@/app/app/actions';

export interface HistoryRow {
  id: string;
  trade_date: string;
  symbol: string;
  direction: string | null;
  pnl: number;
  fees: number;
  tags: string[];
  source: string;
  import_batch: string | null;
  import_platform: string | null;
}

function platformLabel(key: string | null): string {
  if (!key) return 'CSV';
  return (ADAPTERS as Record<string, { label: string }>)[key]?.label ?? 'CSV';
}

/**
 * En-tête et lignes sont des grilles SÉPARÉES : une colonne `auto` s'y résoudrait
 * à des largeurs différentes (« P&L » dans l'en-tête vs « +340,00 » dans la ligne),
 * d'où un décalage. Les colonnes non flexibles sont donc déterministes, les autres
 * en `fr` pour qu'aucune barre de défilement horizontale n'apparaisse.
 * Ordre : case · date · type · P&L · tags · action.
 */
const COLS_TRADES = '18px 104px minmax(0,1.1fr) 104px minmax(0,1fr) 76px';

export default function HistoryPanel({
  trades,
  accountId,
  currency,
}: {
  trades: HistoryRow[];
  accountId: string;
  currency: string;
}) {
  const [source, setSource] = useState<'all' | 'manual' | 'csv'>('all');
  const [symbol, setSymbol] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const symbols = useMemo(
    () => [...new Set(trades.map((t) => t.symbol).filter(Boolean))].sort(),
    [trades],
  );

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        if (source === 'manual' && t.source !== 'manual') return false;
        if (source === 'csv' && t.source !== 'csv') return false;
        if (symbol !== 'all' && t.symbol !== symbol) return false;
        if (from && t.trade_date < from) return false;
        if (to && t.trade_date > to) return false;
        return true;
      }),
    [trades, source, symbol, from, to],
  );

  const batches = useMemo(() => {
    const m = new Map<string, { platform: string | null; count: number; min: string; max: string }>();
    for (const t of trades) {
      if (!t.import_batch) continue;
      const b = m.get(t.import_batch);
      if (b) {
        b.count += 1;
        if (t.trade_date < b.min) b.min = t.trade_date;
        if (t.trade_date > b.max) b.max = t.trade_date;
      } else {
        m.set(t.import_batch, { platform: t.import_platform, count: 1, min: t.trade_date, max: t.trade_date });
      }
    }
    return [...m.entries()].map(([id, b]) => ({ id, ...b }));
  }, [trades]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allShown = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShown) filtered.forEach((t) => next.delete(t.id));
      else filtered.forEach((t) => next.add(t.id));
      return next;
    });
  }

  const selectedList = [...selected];
  const hasFilters = source !== 'all' || symbol !== 'all' || from !== '' || to !== '';

  return (
    <div className="jhist">
      {/* Lots d'import — annuler un import entier */}
      {batches.length > 0 ? (
        <div className="card">
          <h3 className="acct-rules-title">Lots d’import</h3>
          <div className="jhist-batches">
            {batches.map((b) => (
              <div key={b.id} className="jhist-batch">
                <div>
                  <span className="jhist-batch-plat">{platformLabel(b.platform)}</span>
                  <span className="jsub"> · {b.count} trade(s) · {b.min === b.max ? b.min : `${b.min} → ${b.max}`}</span>
                </div>
                <form
                  action={deleteImportBatch}
                  onSubmit={(e) => {
                    if (!window.confirm(`Supprimer ce lot de ${b.count} trade(s) ? Action irréversible.`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="account_id" value={accountId} />
                  <input type="hidden" name="import_batch" value={b.id} />
                  <Button type="submit" variant="ghost" size="sm" icon={Trash2} className="btn-danger-ghost">
                    Supprimer le lot
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Filtres */}
      <div className="card jhist-filters">
        <Select
          label="Source"
          value={source}
          onChange={(v) => setSource(v as 'all' | 'manual' | 'csv')}
          width="sm"
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'manual', label: 'Manuel' },
            { value: 'csv', label: 'Import CSV' },
          ]}
        />
        <Select
          label="Symbole"
          value={symbol}
          onChange={setSymbol}
          width="sm"
          options={[{ value: 'all', label: 'Tous' }, ...symbols.map((s) => ({ value: s, label: s }))]}
        />
        <DatePicker id="from" label="Du" value={from} onChange={setFrom} />
        <DatePicker id="to" label="Au" value={to} onChange={setTo} />
        {hasFilters ? (
          <button
            type="button"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            onClick={() => { setSource('all'); setSymbol('all'); setFrom(''); setTo(''); }}
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {/* Barre de sélection */}
      {selected.size > 0 ? (
        <form
          action={deleteTradesBulk}
          className="jhist-selbar"
          onSubmit={(e) => {
            if (!window.confirm(`Supprimer ${selected.size} entrée(s) sélectionnée(s) ? Action irréversible.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="account_id" value={accountId} />
          {selectedList.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <span className="jhist-selcount">{selected.size} sélectionnée(s)</span>
          <Button type="submit" variant="danger" size="sm">Supprimer la sélection</Button>
          <button type="button" className={buttonClasses({ variant: 'ghost', size: 'sm' })} onClick={() => setSelected(new Set())}>
            Désélectionner
          </button>
        </form>
      ) : null}

      {/* Table */}
      <div className="card acct2-hist-table">
        {filtered.length === 0 ? (
          <div className="acct2-empty">
            {trades.length === 0 ? 'Aucune entrée. Commence par un P&L rapide dans la console.' : 'Aucune entrée pour ces filtres.'}
          </div>
        ) : (
          <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_TRADES }}>
            <div className="data-head" role="row">
              <span role="columnheader"><input type="checkbox" aria-label="Tout sélectionner" checked={allShown} onChange={toggleAll} className="checkbox" /></span>
              <span role="columnheader">Date</span>
              <span role="columnheader">Type</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>P&L</span>
              <span role="columnheader">Tags</span>
              <span role="columnheader"></span>
            </div>
            {filtered.map((t) => {
              const pnlNet = t.pnl - t.fees;
              const editHref = `/app/accounts/${accountId}/trades/${t.id}`;
              return (
                <div key={t.id} className={`data-row${selected.has(t.id) ? ' is-selected' : ''}`} role="row">
                  <span role="cell">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner l’entrée du ${t.trade_date}`}
                      checked={selected.has(t.id)}
                      onChange={() => toggle(t.id)}
                      className="checkbox"
                    />
                  </span>
                  <Link href={editHref} role="cell" className="num">{t.trade_date}</Link>
                  <Link href={editHref} role="cell">{t.symbol ? `${t.symbol}${t.direction ? ` · ${t.direction}` : ''}` : 'Journalier'}</Link>
                  <Link href={editHref} role="cell" className="num" style={{ color: pnlColor(pnlNet), textAlign: 'right' }}>{signed(pnlNet, currency)}</Link>
                  <span role="cell" className="jchips">
                    {t.tags.map((tag) => <span key={tag} className="jchip">{tagLabel(tag)}</span>)}
                  </span>
                  <span role="cell" className="data-actions">
                    <Link href={editHref} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Éditer</Link>
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
