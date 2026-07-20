import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import { toggleFirmPublish } from './actions';

export const metadata = { title: 'Firms — Admin Tradawave' };

interface FirmRow {
  id: string;
  name: string;
  slug: string;
  market_type: string;
  health_score: number | null;
  is_published: boolean;
  sort_order: number;
}

export default async function FirmsList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('firms')
    .select('id, name, slug, market_type, health_score, is_published, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .returns<FirmRow[]>();

  const firms = data ?? [];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Firms</h1>
          <p className="admin-sub">{firms.length} firm(s) au catalogue.</p>
        </div>
        <Link href="/admin/firms/new" className="btn-grad">
          + Nouvelle firm
        </Link>
      </div>

      {error ? <div className="notice notice-error">{error.message}</div> : null}

      {firms.length === 0 ? (
        <div className="glass admin-empty">
          Aucune firm pour l’instant.{' '}
          <Link href="/admin/firms/new" className="link-accent">
            Créer la première
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
                <th>Marché</th>
                <th>Health</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {firms.map((f) => (
                <tr key={f.id}>
                  <td className="admin-strong">{f.name}</td>
                  <td className="num">{f.slug}</td>
                  <td>{f.market_type}</td>
                  <td className="num">{f.health_score ?? '—'}</td>
                  <td>
                    <PublishToggle
                      action={toggleFirmPublish}
                      id={f.id}
                      isPublished={f.is_published}
                      back="/admin/firms"
                    />
                  </td>
                  <td className="admin-row-actions">
                    <Link href={`/admin/firms/${f.id}`} className="link-accent">
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
