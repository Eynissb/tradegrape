import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlanForm from '../PlanForm';

export const metadata = { title: 'Nouveau plan — Admin Tradegrape' };

export default async function NewPlan({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string; error?: string }>;
}) {
  const { firm: firmId, error } = await searchParams;
  if (!firmId) notFound();

  const supabase = await createClient();
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', firmId)
    .single<{ id: string; name: string }>();

  if (!firm) notFound();

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">Firms</Link>{' / '}
        <Link href={`/admin/firms/${firm.id}`} className="link-accent">{firm.name}</Link>{' '}
        / Nouveau plan
      </nav>
      <h1 className="admin-h1">Nouveau plan · {firm.name}</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <PlanForm firmId={firm.id} />
      </div>
    </div>
  );
}
