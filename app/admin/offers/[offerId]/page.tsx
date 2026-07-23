import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OfferForm, { type OfferValues } from '../OfferForm';
import PayoutCapsEditor, { type PayoutCapRow } from '../PayoutCapsEditor';
import ScalingStepsEditor, { type ScalingStepRow } from '../ScalingStepsEditor';
import { deleteOffer, toggleOfferPublish } from '../actions';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import Button from '@/components/ui/Button';

export const metadata = { title: 'Éditer une offre — Admin Tradegrape' };

export default async function EditOffer({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { offerId } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single<OfferValues & { plan_id: string }>();

  if (!offer) notFound();

  const { data: capsData } = await supabase
    .from('offer_payout_caps')
    .select('id, cycle_from, cycle_to, max_amount, max_pct, min_profit, note')
    .eq('offer_id', offerId)
    .order('cycle_from', { ascending: true })
    .returns<PayoutCapRow[]>();
  const caps = capsData ?? [];

  const { data: scalingData } = await supabase
    .from('offer_scaling_steps')
    .select('id, profit_from, profit_to, max_minis, max_micros, phase')
    .eq('offer_id', offerId)
    .order('profit_from', { ascending: true })
    .returns<ScalingStepRow[]>();
  const scalingSteps = scalingData ?? [];

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, firm_id, is_published')
    .eq('id', offer.plan_id)
    .single<{ id: string; name: string; firm_id: string; is_published: boolean }>();

  const { data: firm } = plan
    ? await supabase
        .from('firms')
        .select('id, name, is_published')
        .eq('id', plan.firm_id)
        .single<{ id: string; name: string; is_published: boolean }>()
    : { data: null };

  const parentDraft = (plan && !plan.is_published) || (firm && !firm.is_published);
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
      <div className="admin-title-row">
        <h1 className="admin-h1">Offre {sizeLabel}</h1>
        <PublishToggle
          action={toggleOfferPublish}
          id={offerId}
          isPublished={!!offer.is_published}
          back={`/admin/offers/${offerId}`}
        />
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {saved === 'cap' ? <div className="notice notice-info mt-4">Plafond ajouté.</div> : null}
      {saved === 'cap-del' ? <div className="notice notice-info mt-4">Plafond supprimé.</div> : null}
      {saved === 'scaling' ? <div className="notice notice-info mt-4">Palier ajouté.</div> : null}
      {saved === 'scaling-del' ? <div className="notice notice-info mt-4">Palier supprimé.</div> : null}

      {offer.is_published && !offer.reviewed_at ? (
        <div className="notice notice-warn mt-4">
          Offre <strong>publiée mais jamais vérifiée à la source</strong>. Renseigne la date de
          vérification ci-dessous — l’honnêteté des données est le cœur du positionnement (§8).
        </div>
      ) : null}

      {offer.is_published && parentDraft ? (
        <div className="notice notice-warn mt-4">
          Cette offre est publiée mais <strong>masquée en public</strong> :{' '}
          {firm && !firm.is_published ? 'sa firm' : 'son plan'} est en brouillon.{' '}
          {plan ? (
            <Link href={`/admin/plans/${plan.id}`} className="link-accent">
              Ouvrir le plan
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <OfferForm offer={offer} />
      </div>

      <div className="mt-8">
        <PayoutCapsEditor offerId={offerId} caps={caps} />
      </div>

      <div className="mt-8">
        <ScalingStepsEditor offerId={offerId} steps={scalingSteps} />
      </div>

      <form action={deleteOffer} className="admin-danger">
        <input type="hidden" name="id" value={offerId} />
        <input type="hidden" name="plan_id" value={offer.plan_id} />
        <span>Supprimer définitivement cette offre.</span>
        <Button type="submit" variant="danger" size="sm">Supprimer l’offre</Button>
      </form>
    </div>
  );
}
