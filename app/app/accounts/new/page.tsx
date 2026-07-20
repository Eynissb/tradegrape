import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AddAccountForms, { type OfferOption } from './AddAccountForms';

export const metadata = { title: 'Ajouter un compte — Tradawave' };

export default async function NewAccount({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from('offers')
    .select(
      'id, account_size, currency, drawdown_type, plan:plans!inner ( name, firm:firms!inner ( name ) )',
    )
    .eq('is_published', true)
    .order('account_size', { ascending: true })
    .returns<OfferOption[]>();

  return (
    <main className="jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">
          Mes comptes
        </Link>{' '}
        / Ajouter
      </nav>
      <h1 className="jh1">Ajouter un compte</h1>
      <p className="jsub mt-1">
        Deux chemins : une offre du catalogue (règles pré-remplies) ou saisie manuelle si ta
        firm n’est pas encore listée.
      </p>

      {error ? <div className="notice notice-error mt-5">{error}</div> : null}

      <AddAccountForms offers={data ?? []} />
    </main>
  );
}
