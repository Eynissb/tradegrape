import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Firms demandées — Admin Tradegrape' };

interface RequestedFirm {
  id: string;
  name: string;
  request_count: number;
  first_requested_at: string;
  last_requested_at: string;
}

/* Colonnes déterministes : en-tête et lignes sont deux grilles distinctes. */
const COLS_REQUESTED = 'minmax(0,1fr) 110px 130px 130px';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function RequestedFirmsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('requested_firms')
    .select('id, name, request_count, first_requested_at, last_requested_at')
    .order('request_count', { ascending: false })
    .order('last_requested_at', { ascending: false })
    .returns<RequestedFirm[]>();

  const rows = data ?? [];

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Firms demandées</h1>
      <p className="admin-sub">
        Firms saisies par les traders via un compte personnalisé. Trie tes priorités
        d’ajout au comparateur.
      </p>

      {error ? (
        <div className="notice notice-error mt-4">
          Table indisponible ({error.message}). Applique la migration{' '}
          <span className="num">0003_requested_firms.sql</span>.
        </div>
      ) : rows.length === 0 ? (
        <div className="card admin-empty mt-4">Aucune demande pour l’instant.</div>
      ) : (
        <div className="table-scroll mt-4">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_REQUESTED }}>
            <div className="data-head" role="row">
              <span role="columnheader">Firm</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Demandes</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Première</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Dernière</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="data-row" role="row">
                <span role="cell" data-label="Firm" className="admin-strong">{r.name}</span>
                <span role="cell" data-label="Demandes" className="num" style={{ textAlign: 'right' }}>{r.request_count}</span>
                <span role="cell" data-label="Première" className="num" style={{ textAlign: 'right' }}>{fmtDate(r.first_requested_at)}</span>
                <span role="cell" data-label="Dernière" className="num" style={{ textAlign: 'right' }}>{fmtDate(r.last_requested_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
