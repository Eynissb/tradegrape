import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlanForm, { type PlanValues } from '../PlanForm';
import { deletePlan } from '../actions';

export const metadata = { title: 'Éditer un plan — Admin Tradawave' };

interface OfferRow {
  id: string;
  account_size: number;
  price: number;
  drawdown_type: string;
  is_published: boolean;
}

export default async function EditPlan({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { planId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('plans')
    .select('id, firm_id, slug, name, account_kind, description, rating, rating_note, is_published, sort_order')
    .eq('id', planId)
    .single<PlanValues & { firm_id: string }>();

  if (!plan) notFound();

  const [{ data: firm }, { data: offersData }] = await Promise.all([
    supabase.from('firms').select('id, name').eq('id', plan.firm_id).single<{ id: string; name: string }>(),
    supabase
      .from('offers')
      .select('id, account_size, price, drawdown_type, is_published')
      .eq('plan_id', planId)
      .order('account_size', { ascending: true })
      .returns<OfferRow[]>(),
  ]);

  const offers = offersData ?? [];

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">Firms</Link>{' / '}
        {firm ? (
          <>
            <Link href={`/admin/firms/${firm.id}`} className="link-accent">{firm.name}</Link>{' '}
          </>
        ) : null}
        / {plan.name}
      </nav>
      <h1 className="admin-h1">{plan.name}</h1>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="mt-6">
        <PlanForm plan={plan} />
      </div>

      {/* Offres du plan */}
      <div className="admin-page-head mt-12">
        <div>
          <h2 className="admin-h2">Offres</h2>
          <p className="admin-sub">{offers.length} offre(s) — une par taille de compte.</p>
        </div>
        <Link href={`/admin/offers/new?plan=${plan.id}`} className="btn-grad">
          + Nouvelle offre
        </Link>
      </div>

      {offers.length === 0 ? (
        <div className="glass admin-empty">
          Aucune offre.{' '}
          <Link href={`/admin/offers/new?plan=${plan.id}`} className="link-accent">
            Ajouter la première
          </Link>
          .
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Taille</th>
                <th>Prix</th>
                <th>Drawdown</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td className="admin-strong num">{o.account_size.toLocaleString('fr-FR')}</td>
                  <td className="num">{o.price.toLocaleString('fr-FR')}</td>
                  <td>{o.drawdown_type}</td>
                  <td>
                    <span className={o.is_published ? 'admin-badge is-on' : 'admin-badge'}>
                      {o.is_published ? 'publiée' : 'brouillon'}
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/offers/${o.id}`} className="link-accent">Éditer</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={deletePlan} className="admin-danger">
        <input type="hidden" name="id" value={plan.id} />
        <input type="hidden" name="firm_id" value={plan.firm_id} />
        <span>Supprimer ce plan et toutes ses offres.</span>
        <button type="submit" className="admin-btn-danger">Supprimer le plan</button>
      </form>
    </div>
  );
}
