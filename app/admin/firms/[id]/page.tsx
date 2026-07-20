import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FirmForm, { type FirmValues } from '../FirmForm';
import { deleteFirm } from '../actions';

export const metadata = { title: 'Éditer une firm — Admin Tradawave' };

export default async function EditFirm({
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
    .select('*')
    .eq('id', id)
    .single<FirmValues>();

  if (!firm) notFound();

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">
          Firms
        </Link>{' '}
        / {firm.name ?? 'Éditer'}
      </nav>
      <h1 className="admin-h1">{firm.name}</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <FirmForm firm={firm} />
      </div>

      <form action={deleteFirm} className="admin-danger">
        <input type="hidden" name="id" value={id} />
        <span>Supprimer définitivement cette firm et tout ce qui en dépend.</span>
        <button type="submit" className="admin-btn-danger">
          Supprimer
        </button>
      </form>
    </div>
  );
}
