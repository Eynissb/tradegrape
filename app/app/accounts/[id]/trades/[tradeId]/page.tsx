import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import EntryForms, { type TradeValues } from '../../EntryForms';
import { deleteTrade } from '@/app/app/actions';
import Button, { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Modifier une entrée — Tradegrape' };

export default async function EditTrade({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; tradeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, tradeId } = await params;
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const [{ data: account }, { data: trade }] = await Promise.all([
    supabase
      .from('journal_accounts')
      .select('id, label, rules_snapshot')
      .eq('id', id)
      .single<{ id: string; label: string | null; rules_snapshot: RulesSnapshot }>(),
    supabase
      .from('trades')
      .select(
        'id, trade_date, pnl, fees, symbol, direction, quantity, entry_price, exit_price, notes, tags',
      )
      .eq('id', tradeId)
      .eq('account_id', id)
      .single<TradeValues>(),
  ]);

  if (!account || !trade) notFound();

  const currency = account.rules_snapshot.display?.currency ?? 'USD';

  return (
    <main className="jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">
          Mes comptes
        </Link>{' / '}
        <Link href={`/app/accounts/${id}`} className="link-accent">
          {account.label ?? 'Compte'}
        </Link>{' '}
        / Modifier l’entrée
      </nav>
      <h1 className="jh1">Modifier l’entrée du {trade.trade_date}</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <EntryForms accountId={id} currency={currency} today={today} trade={trade} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link href={`/app/accounts/${id}`} className={buttonClasses({ variant: 'ghost' })}>
          Annuler
        </Link>
        <form action={deleteTrade}>
          <input type="hidden" name="id" value={trade.id} />
          <input type="hidden" name="account_id" value={id} />
          <Button type="submit" variant="danger" size="sm">Supprimer cette entrée</Button>
        </form>
      </div>
    </main>
  );
}
