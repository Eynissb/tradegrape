import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublishToggle from '@/app/admin/_components/PublishToggle';
import { togglePlanPublish } from '@/app/admin/plans/actions';
import Button, { buttonClasses } from '@/components/ui/Button';
import FirmForm, { type FirmValues } from '../FirmForm';
import StyleRulesForm, { type StyleRuleRow } from '../StyleRulesForm';
import { deleteFirm, toggleFirmPublish } from '../actions';

export const metadata = { title: 'Éditer une firm — Admin Tradegrape' };

/* Colonnes déterministes : en-tête et lignes sont deux grilles distinctes. */
const COLS_PLANS = 'minmax(0,1.2fr) minmax(0,1fr) 120px 80px 116px 88px';
const COLS_PROMOS = 'minmax(0,160px) minmax(0,1fr) 96px 96px 80px';

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  account_kind: string;
  rating: number | null;
  is_published: boolean;
}

interface PromoRow {
  id: string;
  code: string;
  discount_note: string | null;
  discount_pct: number | null;
  is_exclusive: boolean;
  is_active: boolean;
  ends_at: string | null;
}

function promoDiscount(p: PromoRow): string {
  if (p.discount_note) return p.discount_note;
  if (p.discount_pct != null) return `-${p.discount_pct}%`;
  return '—';
}

export default async function EditFirm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

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

  const { data: styleData } = await supabase
    .from('firm_style_rules')
    .select('rule_key, stance, threshold_note, detail')
    .eq('firm_id', id)
    .returns<StyleRuleRow[]>();
  const styleRules = styleData ?? [];

  const { data: promoData } = await supabase
    .from('promo_codes')
    .select('id, code, discount_note, discount_pct, is_exclusive, is_active, ends_at')
    .eq('firm_id', id)
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true })
    .returns<PromoRow[]>();
  const promos = promoData ?? [];

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
      {saved === 'style' ? (
        <div className="notice notice-info mt-4">Règles de style enregistrées.</div>
      ) : null}
      {saved === 'promo' ? (
        <div className="notice notice-info mt-4">Code promo enregistré.</div>
      ) : null}
      {saved === 'promo-del' ? (
        <div className="notice notice-info mt-4">Code promo supprimé.</div>
      ) : null}

      {!firm.is_published ? (
        <div className="notice notice-warn mt-4">
          Cette firm est en <strong>brouillon</strong> — rien de ce qu’elle contient
          n’apparaît en public, même les plans et offres publiés.
        </div>
      ) : null}

      <div className="mt-6">
        <FirmForm firm={firm} />
      </div>

      {/* Règles de style — filtre comparateur */}
      <div className="mt-10">
        <StyleRulesForm firmId={id} rules={styleRules} />
      </div>

      {/* Plans de la firm */}
      <div className="admin-page-head mt-12">
        <div>
          <h2 className="admin-h2">Plans</h2>
          <p className="admin-sub">{plans.length} plan(s) — la notation vit ici.</p>
        </div>
        <Link href={`/admin/plans/new?firm=${id}`} className={buttonClasses()}>
          + Nouveau plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          Aucun plan.{' '}
          <Link href={`/admin/plans/new?firm=${id}`} className="link-accent">
            Ajouter le premier
          </Link>
          .
        </div>
      ) : (
        <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_PLANS }}>
            <div className="data-head" role="row">
              <span role="columnheader">Nom</span>
              <span role="columnheader">Slug</span>
              <span role="columnheader">Type</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Note</span>
              <span role="columnheader">Statut</span>
              <span role="columnheader"></span>
            </div>
            {plans.map((p) => (
              <div key={p.id} className="data-row" role="row">
                <span role="cell" data-label="Nom" className="admin-strong">{p.name}</span>
                <span role="cell" data-label="Slug" className="mono" style={{ color: 'var(--ink3)' }}>{p.slug}</span>
                <span role="cell" data-label="Type">{p.account_kind}</span>
                <span role="cell" data-label="Note" className="num" style={{ textAlign: 'right' }}>{p.rating ?? '—'}</span>
                <span role="cell" data-label="Statut">
                  <PublishToggle
                    action={togglePlanPublish}
                    id={p.id}
                    isPublished={p.is_published}
                    back={`/admin/firms/${id}`}
                    onLabel="Publié"
                    hidden={p.is_published && !firm.is_published}
                  />
                </span>
                <span role="cell" className="data-actions">
                  <Link href={`/admin/plans/${p.id}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Éditer</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Codes promo de la firm */}
      <div className="admin-page-head mt-12">
        <div>
          <h2 className="admin-h2">Codes promo</h2>
          <p className="admin-sub">{promos.length} code(s) — liés à l’affiliation.</p>
        </div>
        <Link href={`/admin/firms/${id}/promos/new`} className={buttonClasses()}>
          + Nouveau code
        </Link>
      </div>

      {promos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--ink3)' }}>
          Aucun code promo.{' '}
          <Link href={`/admin/firms/${id}/promos/new`} className="link-accent">
            Ajouter le premier
          </Link>
          .
        </div>
      ) : (
        <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_PROMOS }}>
            <div className="data-head" role="row">
              <span role="columnheader">Code</span>
              <span role="columnheader">Remise</span>
              <span role="columnheader">Statut</span>
              <span role="columnheader">Fin</span>
              <span role="columnheader"></span>
            </div>
            {promos.map((p) => (
              <div key={p.id} className="data-row" role="row">
                <span role="cell" data-label="Code" className="mono admin-strong">
                  {p.code}
                  {p.is_exclusive ? <span className="badge badge-magenta" style={{ marginLeft: 8 }}>exclusif</span> : null}
                </span>
                <span role="cell" data-label="Remise">{promoDiscount(p)}</span>
                <span role="cell" data-label="Statut">
                  {p.is_active
                    ? <span className="badge badge-ok">actif</span>
                    : <span className="badge">inactif</span>}
                </span>
                <span role="cell" data-label="Fin" className="num" style={{ color: 'var(--ink3)' }}>
                  {p.ends_at ? p.ends_at.slice(0, 10) : '—'}
                </span>
                <span role="cell" className="data-actions">
                  <Link href={`/admin/firms/${id}/promos/${p.id}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Éditer</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={deleteFirm} className="admin-danger">
        <input type="hidden" name="id" value={id} />
        <span>Supprimer définitivement cette firm et tout ce qui en dépend.</span>
        <Button type="submit" variant="danger" size="sm">Supprimer</Button>
      </form>
    </div>
  );
}
