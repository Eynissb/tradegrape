import Link from 'next/link';
import { savePlan } from './actions';

export interface PlanValues {
  id?: string;
  firm_id?: string | null;
  slug?: string | null;
  name?: string | null;
  account_kind?: string | null;
  description?: string | null;
  rating?: number | null;
  rating_note?: string | null;
  is_published?: boolean | null;
  sort_order?: number | null;
}

function v(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * @param plan   valeurs existantes (édition)
 * @param firmId firm parente (création — sinon repris de plan.firm_id)
 */
export default function PlanForm({
  plan,
  firmId,
}: {
  plan?: PlanValues;
  firmId?: string;
}) {
  const isEdit = !!plan?.id;
  const parentFirm = plan?.firm_id ?? firmId ?? '';

  return (
    <form action={savePlan} className="flex flex-col gap-6">
      {isEdit ? <input type="hidden" name="id" value={plan!.id} /> : null}
      <input type="hidden" name="firm_id" value={parentFirm} />

      <fieldset className="admin-section">
        <legend>Plan</legend>
        <div className="admin-grid">
          <div className="field">
            <label htmlFor="name">
              Nom<span style={{ color: 'var(--hot)' }}> *</span>
            </label>
            <input className="input" id="name" name="name" required defaultValue={v(plan?.name)} placeholder="Pro" />
          </div>
          <div className="field">
            <label htmlFor="slug">
              Slug<span style={{ color: 'var(--hot)' }}> *</span>
            </label>
            <input className="input" id="slug" name="slug" required defaultValue={v(plan?.slug)} placeholder="pro" />
          </div>
          <div className="field">
            <label htmlFor="account_kind">Type de compte</label>
            <select className="input" id="account_kind" name="account_kind" defaultValue={plan?.account_kind ?? 'evaluation'}>
              <option value="evaluation">evaluation</option>
              <option value="direct">direct</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="rating">Note (0–10)</label>
            <input className="input" id="rating" name="rating" type="number" step="0.1" defaultValue={v(plan?.rating)} placeholder="9.0" />
          </div>
          <div className="field">
            <label htmlFor="sort_order">Ordre de tri</label>
            <input className="input" id="sort_order" name="sort_order" type="number" defaultValue={v(plan?.sort_order)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-section">
        <legend>Éditorial</legend>
        <div className="flex flex-col gap-4">
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea className="input" id="description" name="description" rows={2} defaultValue={v(plan?.description)} />
          </div>
          <div className="field">
            <label htmlFor="rating_note">Note éditoriale (justification)</label>
            <textarea className="input" id="rating_note" name="rating_note" rows={2} defaultValue={v(plan?.rating_note)} />
          </div>
          <label className="admin-check" style={{ alignSelf: 'start', paddingBottom: 0 }}>
            <input type="checkbox" name="is_published" defaultChecked={!!plan?.is_published} />
            <span>Publié (visible public)</span>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-grad">
          {isEdit ? 'Enregistrer' : 'Créer le plan'}
        </button>
        <Link href={parentFirm ? `/admin/firms/${parentFirm}` : '/admin/firms'} className="btn-ghost">
          Annuler
        </Link>
      </div>
    </form>
  );
}
