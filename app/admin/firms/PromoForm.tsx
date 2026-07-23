import Link from 'next/link';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import AdminDateField from '@/app/admin/_components/AdminDateField';
import { savePromo } from './actions';

export interface PromoValues {
  id?: string;
  code?: string | null;
  is_exclusive?: boolean | null;
  discount_pct?: number | null;
  discount_note?: string | null;
  applies_to_plans?: string[] | null;
  excludes_resets?: boolean | null;
  bonus_note?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  last_tested_at?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
}

/** YYYY-MM-DD à partir d'un timestamptz ou d'une date (ou ''). */
function day(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

export default function PromoForm({
  firmId,
  promo,
  plans,
}: {
  firmId: string;
  promo?: PromoValues;
  plans: { id: string; name: string }[];
}) {
  const isEdit = !!promo?.id;
  const selected = new Set(promo?.applies_to_plans ?? []);

  return (
    <form action={savePromo} className="flex flex-col gap-6 ds-form-wide">
      <input type="hidden" name="firm_id" value={firmId} />
      {isEdit ? <input type="hidden" name="id" value={promo!.id} /> : null}

      <fieldset className="admin-section">
        <legend>Code & remise</legend>
        <div className="admin-grid">
          <Input id="code" name="code" label="Code" defaultValue={promo?.code ?? ''} required placeholder="TRADEGRAPE40" />
          <Input id="discount_pct" name="discount_pct" label="Remise (%)" type="number" step="0.01" defaultValue={promo?.discount_pct ?? ''} placeholder="40" />
          <Input id="discount_note" name="discount_note" label="Note de remise" defaultValue={promo?.discount_note ?? ''} placeholder="-40% Pro/Flex, -30% Direct" />
          <Input id="bonus_note" name="bonus_note" label="Bonus" defaultValue={promo?.bonus_note ?? ''} placeholder="+1 éval gratuite" />
          <Input id="sort_order" name="sort_order" label="Ordre d'affichage" type="number" defaultValue={promo?.sort_order ?? 0} />
        </div>
        <div className="admin-checks">
          <Checkbox name="is_exclusive" label="Code exclusif (négocié par nous)" defaultChecked={!!promo?.is_exclusive} />
          <Checkbox name="excludes_resets" label="Ne s'applique pas aux resets" defaultChecked={promo?.excludes_resets ?? true} />
          <Checkbox name="is_active" label="Actif (visible public)" defaultChecked={promo?.is_active ?? true} />
        </div>
      </fieldset>

      <fieldset className="admin-section">
        <legend>Validité</legend>
        <div className="admin-grid">
          <AdminDateField name="starts_at" label="Début" defaultValue={day(promo?.starts_at)} />
          <AdminDateField name="ends_at" label="Fin" defaultValue={day(promo?.ends_at)} hint="Vide = sans date de fin connue." />
          <AdminDateField name="last_tested_at" label="Dernier test du code" defaultValue={day(promo?.last_tested_at)} hint="Quand as-tu vérifié qu'il marche." />
        </div>
      </fieldset>

      <fieldset className="admin-section">
        <legend>Plans concernés</legend>
        {plans.length === 0 ? (
          <p className="admin-sub" style={{ margin: 0 }}>
            Aucun plan sur cette firm. Sans sélection, le code s'applique à toute la firm.
          </p>
        ) : (
          <>
            <p className="admin-sub" style={{ margin: '2px 0 10px' }}>
              Coche les plans visés. Aucune case = le code s'applique à toute la firm.
            </p>
            <div className="admin-checks admin-checks-cols">
              {plans.map((p) => (
                <Checkbox
                  key={p.id}
                  name="applies_to_plans"
                  value={p.id}
                  label={p.name}
                  defaultChecked={selected.has(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit">{isEdit ? 'Enregistrer' : 'Créer le code'}</Button>
        <Link href={`/admin/firms/${firmId}`} className={buttonClasses({ variant: 'ghost' })}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
