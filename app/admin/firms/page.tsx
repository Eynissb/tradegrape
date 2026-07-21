import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import { buttonClasses } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { toggleFirmPublish } from './actions';

export const metadata = { title: 'Firms — Admin Tradegrape' };

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
        <Link href="/admin/firms/new" className={buttonClasses()}>
          + Nouvelle firm
        </Link>
      </div>

      {error ? <div className="notice notice-error">{error.message}</div> : null}

      {firms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune firm au catalogue"
          description="Crée ta première firm pour démarrer le comparateur."
          action={
            <Link href="/admin/firms/new" className={buttonClasses()}>
              Créer la première
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Slug</th>
                <th>Marché</th>
                <th className="num">Health</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {firms.map((f) => (
                <tr key={f.id}>
                  <td data-label="Nom">
                    <span className="cell-firm">{f.name}</span>
                  </td>
                  <td data-label="Slug" className="mono" style={{ color: 'var(--text-3)' }}>
                    {f.slug}
                  </td>
                  <td data-label="Marché">{f.market_type}</td>
                  <td data-label="Health" className="num">{f.health_score ?? '—'}</td>
                  <td data-label="Statut">
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
