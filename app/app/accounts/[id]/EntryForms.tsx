'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { addTrade, updateTrade } from '@/app/app/actions';
import { TAG_FAMILIES } from '@/lib/journal/tags';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';

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
  title,
}: {
  accountId: string;
  currency: string;
  today: string;
  trade?: TradeValues;
  title?: string;
}) {
  const editing = !!trade;
  // Saisie minimale par défaut (date + montant). Détails et tags/notes se déplient.
  const [showDetail, setShowDetail] = useState(editing && !!trade?.symbol);
  const [showTags, setShowTags] = useState(
    editing && (((trade?.tags?.length ?? 0) > 0) || !!trade?.notes),
  );
  const [dateValue, setDateValue] = useState<string>(trade?.trade_date ?? today);
  const mode = showDetail ? 'detailed' : 'daily';

  return (
    <div className="jentry card ds-form">
      {title ? <h2 className="acct-rules-title">{title}</h2> : null}

      <form action={editing ? updateTrade : addTrade} className="jentry-form">
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="mode" value={mode} />
        {editing ? <input type="hidden" name="id" value={trade!.id} /> : null}

        {/* Essentiel : une date, un montant */}
        <div className="jentry-grid">
          <DatePicker
            id="trade_date"
            name="trade_date"
            label="Date"
            required
            value={dateValue}
            onChange={setDateValue}
          />
          <Input
            id="pnl"
            name="pnl"
            label={`P&L ${showDetail ? 'net' : 'du jour'} (${currency})`}
            type="number"
            step="0.01"
            required
            defaultValue={v(trade?.pnl)}
            placeholder="ex : 420 ou -180"
            mono
          />
        </div>

        {/* Déclencheurs de dépliage — la saisie quotidienne reste courte */}
        <div className="jentry-disclosures">
          <button
            type="button"
            className="jentry-toggle"
            aria-expanded={showDetail}
            onClick={() => setShowDetail((x) => !x)}
          >
            <ChevronDown aria-hidden="true" />
            {showDetail ? 'Masquer le détail du trade' : 'Détailler le trade'}
          </button>
          <button
            type="button"
            className="jentry-toggle"
            aria-expanded={showTags}
            onClick={() => setShowTags((x) => !x)}
          >
            <ChevronDown aria-hidden="true" />
            {showTags ? 'Masquer tags & notes' : 'Ajouter tags & notes'}
          </button>
        </div>

        {/* Détails du trade — repliés par défaut */}
        {showDetail ? (
          <div className="jentry-grid">
            <Input id="symbol" name="symbol" label="Symbole" defaultValue={v(trade?.symbol)} placeholder="ES, NQ, MES…" />
            <Select
              name="direction"
              label="Sens"
              defaultValue={v(trade?.direction) ?? ''}
              options={[
                { value: '', label: '—' },
                { value: 'long', label: 'Long' },
                { value: 'short', label: 'Short' },
              ]}
            />
            <Input id="quantity" name="quantity" label="Quantité" type="number" step="1" defaultValue={v(trade?.quantity)} mono />
            <Input id="entry_price" name="entry_price" label="Entrée" type="number" step="0.000001" defaultValue={v(trade?.entry_price)} mono />
            <Input id="exit_price" name="exit_price" label="Sortie" type="number" step="0.000001" defaultValue={v(trade?.exit_price)} mono />
            <Input id="fees" name="fees" label={`Frais (${currency})`} type="number" step="0.01" defaultValue={v(trade?.fees)} mono />
          </div>
        ) : null}

        {/* Tags & notes — repliés par défaut */}
        {showTags ? (
          <>
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

            <Textarea id="notes" name="notes" label="Notes" rows={2} defaultValue={v(trade?.notes)} placeholder="Comment s’est passée la session ?" />
          </>
        ) : null}

        <Button type="submit">
          {editing ? 'Enregistrer les modifications' : 'Enregistrer l’entrée'}
        </Button>
      </form>
    </div>
  );
}
