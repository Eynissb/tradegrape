import { createClient } from '@/lib/supabase/server';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { createPlatform, deletePlatform } from './actions';

export const metadata = { title: 'Plateformes — Admin Tradegrape' };

const COLS = 'minmax(0,1fr) minmax(0,1fr) 120px 80px';

interface PlatformRow {
  id: string;
  slug: string;
  name: string;
  is_datafeed: boolean;
}

export default async function PlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from('platforms')
    .select('id, slug, name, is_datafeed')
    .order('name', { ascending: true })
    .returns<PlatformRow[]>();
  const platforms = data ?? [];

  return (
    <div className="admin-page">
      <div className="admin-title-row">
        <h1 className="admin-h1">Plateformes</h1>
      </div>
      <p className="admin-sub">
        Catalogue partagé des plateformes et flux de données. Rattachées ensuite à chaque firm.
      </p>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {saved === '1' ? <div className="notice notice-info mt-4">Plateforme ajoutée.</div> : null}
      {saved === 'del' ? <div className="notice notice-info mt-4">Plateforme supprimée.</div> : null}

      <form action={createPlatform} className="mt-6">
        <fieldset className="admin-section">
          <legend>Nouvelle plateforme</legend>
          <div className="admin-grid">
            <Input name="name" label="Nom" required placeholder="Tradovate" />
            <Input name="slug" label="Slug" required placeholder="tradovate" />
            <Input name="website_url" label="Site web" placeholder="https://…" />
          </div>
          <div className="admin-checks">
            <Checkbox name="is_datafeed" label="Flux de données (vs plateforme de trading)" />
          </div>
        </fieldset>
        <div className="mt-4"><Button type="submit">Ajouter</Button></div>
      </form>

      <div className="mt-8">
        {platforms.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--ink3)' }}>
            Aucune plateforme. Ajoute-en une ci-dessus.
          </div>
        ) : (
          <div className="table-scroll">
            <div className="data-list" role="table" style={{ ['--cols' as string]: COLS }}>
              <div className="data-head" role="row">
                <span role="columnheader">Nom</span>
                <span role="columnheader">Slug</span>
                <span role="columnheader">Type</span>
                <span role="columnheader"></span>
              </div>
              {platforms.map((p) => (
                <div key={p.id} className="data-row" role="row">
                  <span role="cell" data-label="Nom" className="admin-strong">{p.name}</span>
                  <span role="cell" data-label="Slug" className="mono" style={{ color: 'var(--ink3)' }}>{p.slug}</span>
                  <span role="cell" data-label="Type">{p.is_datafeed ? 'Flux' : 'Trading'}</span>
                  <span role="cell" className="data-actions">
                    <form action={deletePlatform}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">Suppr.</Button>
                    </form>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
