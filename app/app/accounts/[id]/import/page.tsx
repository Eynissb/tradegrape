import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import ImportTradesClient from './ImportTradesClient';

export const metadata = { title: 'Importer des trades — Tradegrape' };

export default async function ImportTradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, rules_snapshot')
    .eq('id', id)
    .single<{ id: string; label: string | null; rules_snapshot: RulesSnapshot }>();

  if (!account) notFound();
  const currency = account.rules_snapshot.display?.currency ?? 'USD';

  return (
    <main className="jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}
        <Link href={`/app/accounts/${id}`} className="link-accent">{account.label ?? 'Compte'}</Link>{' / '}
        Importer des trades
      </nav>
      <h1 className="jh1">Importer des trades</h1>
      <p className="jsub mt-1">
        Choisis ta plateforme, dépose l’export CSV. Rien n’est enregistré avant ta confirmation.
      </p>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <ImportTradesClient accountId={account.id} currency={currency} />
      </div>
    </main>
  );
}
