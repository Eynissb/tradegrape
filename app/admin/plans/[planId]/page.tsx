import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlanForm, { type PlanValues } from '../PlanForm';
import { deletePlan, publishAllOffers, togglePlanPublish } from '../actions';
import { duplicateOffers, toggleOfferPublish } from '@/app/admin/offers/actions';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export const metadata = { title: 'Éditer un plan — Admin Tradegrape' };

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
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { planId } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('plans')
    .select('id, firm_id, slug, name, account_kind, description, rating, rating_note, is_published, sort_order')
    .eq('id', planId)
    .single<PlanValues & { firm_id: string }>();

  if (!plan) notFound();

  const [{ data: firm }, { data: offersData }] = await Promise.all([
    supabase
      .from('firms')
      .select('id, name, is_published')
      .eq('id', plan.firm_id)
      .single<{ id: string; name: string; is_published: boolean }>(),
    supabase
      .from('offers')
      .select('id, account_size, price, drawdown_type, is_published')
      .eq('plan_id', planId)
      .order('account_size', { ascending: true })
      .returns<OfferRow[]>(),
  ]);

  const offers = offersData ?? [];
  const firmDraft = !!firm && !firm.is_published;
  const planDraft = !plan.is_published;

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
      <div className="admin-title-row">
        <h1 className="admin-h1">{plan.name}</h1>
        <PublishToggle
          action={togglePlanPublish}
          id={plan.id!}
          isPublished={!planDraft}
          back={`/admin/plans/${plan.id}`}
          onLabel="Publié"
        />
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {message ? <div className="notice notice-info mt-4">{message}</div> : null}

      {firmDraft ? (
        <div className="notice notice-warn mt-4">
          La firm <strong>{firm!.name}</strong> est en brouillon — ce plan et ses offres
          n’apparaissent pas en public, même publiés.{' '}
          <Link href={`/admin/firms/${firm!.id}`} className="link-accent">
            Publier la firm
          </Link>
        </div>
      ) : planDraft ? (
        <div className="notice notice-warn mt-4">
          Ce plan est en <strong>brouillon</strong> — ses offres publiées n’apparaissent
          pas en public.
        </div>
      ) : null}

      <div className="mt-6">
        <PlanForm plan={plan} />
      </div>

      {/* Offres du plan */}
      <div className="admin-page-head mt-12">
        <div>
          <h2 className="admin-h2">Offres</h2>
          <p className="admin-sub">{offers.length} offre(s) — une par taille de compte.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {offers.length > 0 ? (
            <>
              <form action={publishAllOffers}>
                <input type="hidden" name="plan_id" value={plan.id} />
                <Button type="submit" variant="secondary" size="sm">Tout publier</Button>
              </form>
              <a href={`/admin/offers/export?plan=${plan.id}`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Export CSV
              </a>
            </>
          ) : null}
          <Link href={`/admin/offers/import?plan=${plan.id}`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Import CSV
          </Link>
          <Link href={`/admin/offers/new?plan=${plan.id}`} className={buttonClasses({ size: 'sm' })}>
            + Nouvelle offre
          </Link>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          Aucune offre.{' '}
          <Link href={`/admin/offers/new?plan=${plan.id}`} className="link-accent">
            Ajouter la première
          </Link>
          .
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="num">Taille</th>
                <th className="num">Prix</th>
                <th>Drawdown</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td data-label="Taille" className="num">{o.account_size.toLocaleString('fr-FR')}</td>
                  <td data-label="Prix" className="num">{o.price.toLocaleString('fr-FR')}</td>
                  <td data-label="Drawdown">{o.drawdown_type}</td>
                  <td data-label="Statut">
                    <PublishToggle
                      action={toggleOfferPublish}
                      id={o.id}
                      isPublished={o.is_published}
                      back={`/admin/plans/${plan.id}`}
                      hidden={o.is_published && (planDraft || firmDraft)}
                    />
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

      {/* Duplication d'une offre modèle sur plusieurs tailles */}
      {offers.length > 0 ? (
        <div className="admin-dup card">
          <h2 className="admin-h2">Dupliquer sur plusieurs tailles</h2>
          <p className="admin-sub">
            Génère un brouillon d’offre par taille à partir d’une offre modèle.
            Les règles sont copiées — tu ajustes ensuite les montants par taille.
          </p>
          <form action={duplicateOffers} className="admin-dup-form">
            <input type="hidden" name="plan_id" value={plan.id} />
            <div className="field">
              <label className="label" htmlFor="template_id">Offre modèle</label>
              <select className="input" id="template_id" name="template_id" defaultValue={offers[0].id}>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.account_size.toLocaleString('fr-FR')} · {o.drawdown_type}
                  </option>
                ))}
              </select>
            </div>
            <Input id="sizes" name="sizes" label="Tailles cibles (séparées par virgule)" placeholder="25000, 50000, 100000, 150000" />
            <Button type="submit">Générer</Button>
          </form>
        </div>
      ) : null}

      <form action={deletePlan} className="admin-danger">
        <input type="hidden" name="id" value={plan.id} />
        <input type="hidden" name="firm_id" value={plan.firm_id} />
        <span>Supprimer ce plan et toutes ses offres.</span>
        <Button type="submit" variant="danger" size="sm">Supprimer le plan</Button>
      </form>
    </div>
  );
}
