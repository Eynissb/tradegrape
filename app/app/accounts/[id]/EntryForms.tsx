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
import Tabs from '@/components/ui/Tabs';

export interface TradeValues {
  id: string;
  trade_date: string;
  closed_at?: string | null;
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
  defaultShowTags = false,
}: {
  accountId: string;
  currency: string;
  today: string;
  trade?: TradeValues;
  title?: string;
  /** Déplie tags & notes dès l'ouverture (ex. modal « Ajouter un trade »). */
  defaultShowTags?: boolean;
}) {
  const editing = !!trade;
  // Deux natures d'entrée annoncées par les onglets ; tags & notes se déplient.
  const [mode, setMode] = useState<'daily' | 'detailed'>(
    trade && trade.symbol ? 'detailed' : 'daily',
  );
  const [showTags, setShowTags] = useState(
    defaultShowTags || (editing && (((trade?.tags?.length ?? 0) > 0) || !!trade?.notes)),
  );
  const [dateValue, setDateValue] = useState<string>(trade?.trade_date ?? today);
  const detailed = mode === 'detailed';

  return (
    <div className="jentry card ds-form">
      {title ? <h2 className="acct-rules-title">{title}</h2> : null}

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'daily', label: 'Saisie rapide' },
            { id: 'detailed', label: 'Trade détaillé' },
          ]}
          active={mode}
          onChange={(id) => setMode(id as 'daily' | 'detailed')}
          ariaLabel="Type de saisie"
        />
        <p className="jentry-hint">
          {detailed
            ? 'Une ligne par trade : symbole, sens, prix, P&L net.'
            : 'L’essentiel : une date et le P&L du jour. Passe en « Trade détaillé » pour journaliser trade par trade.'}
        </p>
      </div>

      <form action={editing ? updateTrade : addTrade} className="jentry-form">
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="mode" value={mode} />
        {editing ? <input type="hidden" name="id" value={trade!.id} /> : null}

        <div className="jentry-grid">
          <DatePicker
            id="trade_date"
            name="trade_date"
            label="Date"
            required
            value={dateValue}
            onChange={setDateValue}
          />

          {detailed ? (
            <>
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
              <Input
                id="trade_time"
                name="trade_time"
                label="Heure de clôture"
                type="time"
                width="sm"
                defaultValue={trade?.closed_at ? String(trade.closed_at).slice(11, 16) : undefined}
                hint="Pour la ventilation par heure"
              />
            </>
          ) : null}

          <Input
            id="pnl"
            name="pnl"
            label={`P&L ${detailed ? 'net' : 'du jour'} (${currency})`}
            type="number"
            step="0.01"
            required
            defaultValue={v(trade?.pnl)}
            placeholder="ex : 420 ou -180"
            mono
          />

          {detailed ? (
            <Input id="fees" name="fees" label={`Frais (${currency})`} type="number" step="0.01" defaultValue={v(trade?.fees)} mono />
          ) : null}
        </div>

        {/* Tags & notes — repliés par défaut, la saisie quotidienne reste courte */}
        <div className="jentry-disclosures">
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
