import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin — Tradawave' };

export default async function AdminHome() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('firms')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Back-office</h1>
      <p className="admin-sub">Gère le catalogue, les guides et la modération.</p>

      <div className="admin-cards">
        <Link href="/admin/firms" className="admin-card">
          <span className="admin-card-k num">{count ?? 0}</span>
          <span className="admin-card-l">Firms</span>
          <span className="admin-card-d">Créer, éditer, publier</span>
        </Link>

        <div className="admin-card">
          <span className="admin-card-k num">↳</span>
          <span className="admin-card-l">Plans · Offers</span>
          <span className="admin-card-d">Édités depuis chaque firm</span>
        </div>

        <Link href="/admin/requested-firms" className="admin-card">
          <span className="admin-card-k num">★</span>
          <span className="admin-card-l">Firms demandées</span>
          <span className="admin-card-d">Priorités d’ajout au catalogue</span>
        </Link>
      </div>
    </div>
  );
}
