import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OfferForm, { type OfferValues } from '../OfferForm';
import { deleteOffer } from '../actions';

export const metadata = { title: 'Éditer une offre — Admin Tradawave' };

export default async function EditOffer({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { offerId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single<OfferValues & { plan_id: string }>();

  if (!offer) notFound();

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, firm_id')
    .eq('id', offer.plan_id)
    .single<{ id: string; name: string; firm_id: string }>();

  const sizeLabel =
    offer.account_size != null ? offer.account_size.toLocaleString('fr-FR') : '';

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">Firms</Link>{' / '}
        {plan ? (
          <>
            <Link href={`/admin/firms/${plan.firm_id}`} className="link-accent">Firm</Link>{' / '}
            <Link href={`/admin/plans/${plan.id}`} className="link-accent">{plan.name}</Link>{' '}
          </>
        ) : null}
        / Offre {sizeLabel}
      </nav>
      <h1 className="admin-h1">Offre {sizeLabel}</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <OfferForm offer={offer} />
      </div>

      <form action={deleteOffer} className="admin-danger">
        <input type="hidden" name="id" value={offerId} />
        <input type="hidden" name="plan_id" value={offer.plan_id} />
        <span>Supprimer définitivement cette offre.</span>
        <button type="submit" className="admin-btn-danger">Supprimer l’offre</button>
      </form>
    </div>
  );
}
