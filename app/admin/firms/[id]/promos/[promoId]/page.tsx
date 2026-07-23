import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Button from '@/components/ui/Button';
import PromoForm, { type PromoValues } from '../../../PromoForm';
import { deletePromo } from '../../../actions';

export const metadata = { title: 'Éditer un code promo — Admin Tradegrape' };

export default async function EditPromo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; promoId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, promoId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', id)
    .single<{ id: string; name: string }>();
  if (!firm) notFound();

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('id', promoId)
    .eq('firm_id', id)
    .single<PromoValues>();
  if (!promo) notFound();

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
        / Code {promo.code}
      </nav>
      <h1 className="admin-h1">Code {promo.code}</h1>
      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      <div className="mt-6">
        <PromoForm firmId={id} promo={promo} plans={plans ?? []} />
      </div>

      <form action={deletePromo} className="admin-danger">
        <input type="hidden" name="id" value={promoId} />
        <input type="hidden" name="firm_id" value={id} />
        <span>Supprimer définitivement ce code.</span>
        <Button type="submit" variant="danger" size="sm">Supprimer</Button>
      </form>
    </div>
  );
}
