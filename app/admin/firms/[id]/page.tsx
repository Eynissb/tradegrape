import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import { togglePlanPublish } from '@/app/admin/plans/actions';
import FirmForm, { type FirmValues } from '../FirmForm';
import { deleteFirm, toggleFirmPublish } from '../actions';

export const metadata = { title: 'Éditer une firm — Admin Tradawave' };

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  account_kind: string;
  rating: number | null;
  is_published: boolean;
}

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

  const { data: plansData } = await supabase
    .from('plans')
    .select('id, name, slug, account_kind, rating, is_published')
    .eq('firm_id', id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .returns<PlanRow[]>();

  const plans = plansData ?? [];

  return (
    <div className="admin-page">
      <nav className="admin-crumb">
        <Link href="/admin/firms" className="link-accent">
          Firms
        </Link>{' '}
        / {firm.name ?? 'Éditer'}
      </nav>
      <div className="admin-title-row">
        <h1 className="admin-h1">{firm.name}</h1>
        <PublishToggle
          action={toggleFirmPublish}
          id={id}
          isPublished={!!firm.is_published}
          back={`/admin/firms/${id}`}
        />
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      {!firm.is_published ? (
        <div className="notice notice-warn mt-4">
          Cette firm est en <strong>brouillon</strong> — rien de ce qu’elle contient
          n’apparaît en public, même les plans et offres publiés.
        </div>
      ) : null}

      <div className="mt-6">
        <FirmForm firm={firm} />
      </div>

      {/* Plans de la firm */}
      <div className="admin-page-head mt-12">
        <div>
          <h2 className="admin-h2">Plans</h2>
          <p className="admin-sub">{plans.length} plan(s) — la notation vit ici.</p>
        </div>
        <Link href={`/admin/plans/new?firm=${id}`} className="btn-grad">
          + Nouveau plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="glass admin-empty">
          Aucun plan.{' '}
          <Link href={`/admin/plans/new?firm=${id}`} className="link-accent">
            Ajouter le premier
          </Link>
          .
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Note</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="admin-strong">{p.name}</td>
                  <td className="num">{p.slug}</td>
                  <td>{p.account_kind}</td>
                  <td className="num">{p.rating ?? '—'}</td>
                  <td>
                    <PublishToggle
                      action={togglePlanPublish}
                      id={p.id}
                      isPublished={p.is_published}
                      back={`/admin/firms/${id}`}
                      onLabel="Publié"
                      hidden={p.is_published && !firm.is_published}
                    />
                  </td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/plans/${p.id}`} className="link-accent">
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
