import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ImportClient from './ImportClient';

export const metadata = { title: 'Import CSV — Admin Tradawave' };

export default async function ImportOffers({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const { plan: planId, error } = await searchParams;
  if (!planId) notFound();

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, firm_id')
    .eq('id', planId)
    .single<{ id: string; name: string; firm_id: string }>();

  if (!plan) notFound();

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">Firms</Link>{' / '}
        <Link href={`/admin/firms/${plan.firm_id}`} className="link-accent">Firm</Link>{' / '}
        <Link href={`/admin/plans/${plan.id}`} className="link-accent">{plan.name}</Link>{' '}
        / Import CSV
      </nav>
      <h1 className="admin-h1">Import CSV · {plan.name}</h1>
      <p className="admin-sub mt-1">
        Colonne <span className="num">account_size</span> obligatoire ; clé d’upsert{' '}
        <span className="num">plan + taille</span>. Rien n’est écrit avant ta confirmation.
      </p>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <ImportClient planId={plan.id} />
      </div>
    </div>
  );
}
