import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import { saveAccountCommission } from '@/app/app/actions';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import Button, { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Paramètres du compte — Tradegrape' };

export default async function AccountSettings({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, rules_snapshot, commission_per_contract')
    .eq('id', id)
    .single<{ id: string; label: string | null; rules_snapshot: RulesSnapshot; commission_per_contract: number | null }>();
  if (!account) notFound();

  const currency = account.rules_snapshot.display?.currency ?? 'USD';
  const { count } = await supabase
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)
    .eq('source', 'csv');
  const importedCount = count ?? 0;

  return (
    <main className="jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}
        <Link href={`/app/accounts/${id}`} className="link-accent">{account.label ?? 'Compte'}</Link>{' / '}
        Paramètres
      </nav>
      <h1 className="jh1">Paramètres du compte</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {saved ? <div className="notice notice-info mt-4">Enregistré.</div> : null}

      <form action={saveAccountCommission} className="card ds-form mt-6">
        <input type="hidden" name="id" value={account.id} />

        <h2 className="acct-rules-title">Commissions</h2>
        <p className="jsub" style={{ marginBottom: '1rem' }}>
          Commission par contrat aller-retour, appliquée aux imports sans colonne de frais
          (Tradovate, Apex…). Le moteur calcule la progression vers l’objectif sur le net —
          renseigner ce taux corrige la surestimation du P&L. Vide = non renseignée.
        </p>

        <Input
          id="commission_per_contract"
          name="commission_per_contract"
          label={`Commission par contrat aller-retour (${currency})`}
          type="number"
          step="0.0001"
          min="0"
          width="sm"
          mono
          defaultValue={account.commission_per_contract ?? ''}
          placeholder="ex : 3.64"
        />

        {importedCount > 0 ? (
          <div className="mt-4">
            <Checkbox
              name="apply_existing"
              label={`Recalculer les frais des ${importedCount} trade(s) déjà importé(s) avec ce taux`}
              defaultChecked={account.commission_per_contract == null}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-3 mt-5">
          <Button type="submit">Enregistrer</Button>
          <Link href={`/app/accounts/${id}`} className={buttonClasses({ variant: 'ghost' })}>Retour au compte</Link>
        </div>
      </form>
    </main>
  );
}
