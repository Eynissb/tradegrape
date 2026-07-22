import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import { buttonClasses } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { toggleFirmPublish } from './actions';

export const metadata = { title: 'Firms — Admin Tradegrape' };

/* Colonnes déterministes : en-tête et lignes sont deux grilles distinctes. */
const COLS_FIRMS = 'minmax(0,1.2fr) minmax(0,1fr) 100px 84px 116px 88px';

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
        <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_FIRMS }}>
            <div className="data-head" role="row">
              <span role="columnheader">Nom</span>
              <span role="columnheader">Slug</span>
              <span role="columnheader">Marché</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Health</span>
              <span role="columnheader">Statut</span>
              <span role="columnheader"></span>
            </div>
            {firms.map((f) => (
              <div key={f.id} className="data-row" role="row">
                <span role="cell" data-label="Nom" className="admin-strong">{f.name}</span>
                <span role="cell" data-label="Slug" className="mono" style={{ color: 'var(--ink3)' }}>{f.slug}</span>
                <span role="cell" data-label="Marché">{f.market_type}</span>
                <span role="cell" data-label="Health" className="num" style={{ textAlign: 'right' }}>{f.health_score ?? '—'}</span>
                <span role="cell" data-label="Statut">
                  <PublishToggle
                    action={toggleFirmPublish}
                    id={f.id}
                    isPublished={f.is_published}
                    back="/admin/firms"
                  />
                </span>
                <span role="cell" className="data-actions">
                  <Link href={`/admin/firms/${f.id}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Éditer</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
