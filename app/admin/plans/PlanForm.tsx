import Link from 'next/link';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
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
          <Input id="name" name="name" label="Nom" required defaultValue={v(plan?.name)} placeholder="Pro" />
          <Input id="slug" name="slug" label="Slug" required defaultValue={v(plan?.slug)} placeholder="pro" />
          <div className="field">
            <label className="label" htmlFor="account_kind">Type de compte</label>
            <select className="input" id="account_kind" name="account_kind" defaultValue={plan?.account_kind ?? 'evaluation'}>
              <option value="evaluation">evaluation</option>
              <option value="direct">direct</option>
            </select>
          </div>
          <Input id="rating" name="rating" label="Note (0–10)" type="number" step="0.1" defaultValue={v(plan?.rating)} placeholder="9.0" />
          <Input id="sort_order" name="sort_order" label="Ordre de tri" type="number" defaultValue={v(plan?.sort_order)} />
        </div>
      </fieldset>

      <fieldset className="admin-section">
        <legend>Éditorial</legend>
        <div className="flex flex-col gap-4">
          <Textarea id="description" name="description" label="Description" rows={2} defaultValue={v(plan?.description)} />
          <Textarea id="rating_note" name="rating_note" label="Note éditoriale (justification)" rows={2} defaultValue={v(plan?.rating_note)} />
          <Checkbox name="is_published" label="Publié (visible public)" defaultChecked={!!plan?.is_published} />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer le plan'}</Button>
        <Link
          href={parentFirm ? `/admin/firms/${parentFirm}` : '/admin/firms'}
          className={buttonClasses({ variant: 'ghost' })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
