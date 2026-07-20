'use client';

import { useState } from 'react';
import { addTrade, updateTrade } from '@/app/app/actions';
import { TAG_FAMILIES } from '@/lib/journal/tags';

export interface TradeValues {
  id: string;
  trade_date: string;
  pnl: number | string;
  fees: number | string | null;
  symbol: string | null;
  direction: string | null;
  quantity: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  notes: string | null;
  tags: string[];
}

function v(value: number | string | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

export default function EntryForms({
  accountId,
  currency,
  today,
  trade,
}: {
  accountId: string;
  currency: string;
  today: string;
  trade?: TradeValues;
}) {
  const editing = !!trade;
  const [mode, setMode] = useState<'daily' | 'detailed'>(
    trade && trade.symbol ? 'detailed' : 'daily',
  );
  const detailed = mode === 'detailed';

  return (
    <div className="jentry glass">
      <div className="jentry-tabs">
        <button
          type="button"
          className={mode === 'daily' ? 'is-active' : ''}
          onClick={() => setMode('daily')}
        >
          P&L journalier
        </button>
        <button
          type="button"
          className={detailed ? 'is-active' : ''}
          onClick={() => setMode('detailed')}
        >
          Trade détaillé
        </button>
      </div>

      <form action={editing ? updateTrade : addTrade} className="jentry-form">
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="mode" value={mode} />
        {editing ? <input type="hidden" name="id" value={trade!.id} /> : null}

        <div className="jentry-grid">
          <div className="field">
            <label htmlFor="trade_date">Date</label>
            <input
              className="input"
              id="trade_date"
              name="trade_date"
              type="date"
              defaultValue={v(trade?.trade_date) ?? today}
              required
            />
          </div>

          {detailed ? (
            <>
              <div className="field">
                <label htmlFor="symbol">Symbole</label>
                <input className="input" id="symbol" name="symbol" defaultValue={v(trade?.symbol)} placeholder="ES, NQ, MES…" />
              </div>
              <div className="field">
                <label htmlFor="direction">Sens</label>
                <select className="input" id="direction" name="direction" defaultValue={v(trade?.direction) ?? ''}>
                  <option value="">—</option>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="quantity">Quantité</label>
                <input className="input" id="quantity" name="quantity" type="number" step="1" defaultValue={v(trade?.quantity)} />
              </div>
              <div className="field">
                <label htmlFor="entry_price">Entrée</label>
                <input className="input" id="entry_price" name="entry_price" type="number" step="0.000001" defaultValue={v(trade?.entry_price)} />
              </div>
              <div className="field">
                <label htmlFor="exit_price">Sortie</label>
                <input className="input" id="exit_price" name="exit_price" type="number" step="0.000001" defaultValue={v(trade?.exit_price)} />
              </div>
            </>
          ) : null}

          <div className="field">
            <label htmlFor="pnl">P&L {detailed ? 'net' : 'du jour'} ({currency})</label>
            <input
              className="input"
              id="pnl"
              name="pnl"
              type="number"
              step="0.01"
              required
              defaultValue={v(trade?.pnl)}
              placeholder="ex : 420 ou -180"
            />
          </div>

          {detailed ? (
            <div className="field">
              <label htmlFor="fees">Frais ({currency})</label>
              <input className="input" id="fees" name="fees" type="number" step="0.01" defaultValue={v(trade?.fees)} />
            </div>
          ) : null}
        </div>

        <div className="jtags">
          {TAG_FAMILIES.map((fam) => (
            <div key={fam.key} className="jtag-fam">
              <span className="jtag-fam-label" style={{ color: fam.color }}>
                {fam.label}
              </span>
              <div className="jtag-list">
                {fam.tags.map((t) => {
                  const value = `${fam.key}:${t.key}`;
                  return (
                    <label key={value} className="jtag">
                      <input
                        type="checkbox"
                        name="tags"
                        value={value}
                        defaultChecked={trade?.tags?.includes(value) ?? false}
                      />
                      <span>{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea className="input" id="notes" name="notes" rows={2} defaultValue={v(trade?.notes)} placeholder="Comment s’est passée la session ?" />
        </div>

        <button type="submit" className="btn-grad">
          {editing ? 'Enregistrer les modifications' : 'Enregistrer l’entrée'}
        </button>
      </form>
    </div>
  );
}
