import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PromoForm from '../../../PromoForm';

export const metadata = { title: 'Nouveau code promo — Admin Tradegrape' };

export default async function NewPromo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', id)
    .single<{ id: string; name: string }>();
  if (!firm) notFound();

  const { data: plans } = await supabase
    .from('plans')
    .select('id, name')
    .eq('firm_id', id)
    .order('sort_order', { ascending: true })
    .returns<{ id: string; name: string }[]>();

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">Firms</Link>{' / '}
        <Link href={`/admin/firms/${id}`} className="link-accent">{firm.name}</Link>{' '}
        / Nouveau code
      </nav>
      <h1 className="admin-h1">Nouveau code · {firm.name}</h1>
      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      <div className="mt-6">
        <PromoForm firmId={id} plans={plans ?? []} />
      </div>
    </div>
  );
}
