import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Firms demandées — Admin Tradegrape' };

interface RequestedFirm {
  id: string;
  name: string;
  request_count: number;
  first_requested_at: string;
  last_requested_at: string;
}

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
        <div className="card mt-4" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          Aucune demande pour l’instant.
        </div>
      ) : (
        <div className="table-wrap mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>Firm</th>
                <th className="num">Demandes</th>
                <th className="num">Première</th>
                <th className="num">Dernière</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Firm"><span className="cell-firm">{r.name}</span></td>
                  <td data-label="Demandes" className="num">{r.request_count}</td>
                  <td data-label="Première" className="num">{fmtDate(r.first_requested_at)}</td>
                  <td data-label="Dernière" className="num">{fmtDate(r.last_requested_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
