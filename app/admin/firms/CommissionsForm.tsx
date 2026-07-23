import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ASSET_CLASSES } from '@/lib/catalog/asset-classes';
import { saveCommissions } from './actions';

export interface CommissionRow {
  asset_class: string;
  round_turn: number | null;
  symbols: string[] | null;
  note: string | null;
}

/**
 * Commissions par classe d'actif : une ligne par classe prédéfinie. Un
 * aller-retour vide = la ligne n'est pas enregistrée (ou supprimée). Upsert groupé.
 */
export default function CommissionsForm({
  firmId,
  rows,
}: {
  firmId: string;
  rows: CommissionRow[];
}) {
  const byKey = new Map(rows.map((r) => [r.asset_class, r]));

  return (
    <form action={saveCommissions} className="ds-form-wide">
      <input type="hidden" name="firm_id" value={firmId} />
      <fieldset className="admin-section">
        <legend>Commissions par classe d’actif</legend>
        <p className="admin-sub" style={{ margin: '2px 0 10px' }}>
          Aller-retour par contrat (round turn). Alimente le calculateur de commissions.
        </p>

        <div className="comm-head" aria-hidden="true">
          <span>Classe</span>
          <span>Round turn</span>
          <span>Symboles</span>
          <span>Note</span>
        </div>

        <div className="stylerule-list">
          {ASSET_CLASSES.map((a) => {
            const cur = byKey.get(a.key);
            return (
              <div key={a.key} className="comm-row">
                <div className="stylerule-name">
                  <span className="stylerule-label">{a.label}</span>
                  <span className="stylerule-help">{a.ex}</span>
                </div>
                <Input
                  name={`rt__${a.key}`}
                  type="number"
                  step="0.01"
                  defaultValue={cur?.round_turn ?? ''}
                  placeholder="ex : 3.98"
                  width="sm"
                  mono
                />
                <Input
                  name={`sym__${a.key}`}
                  defaultValue={cur?.symbols?.join(', ') ?? ''}
                  placeholder="ES, NQ"
                />
                <Input
                  name={`note__${a.key}`}
                  defaultValue={cur?.note ?? ''}
                  placeholder="précision libre"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <Button type="submit">Enregistrer les commissions</Button>
      </div>
    </form>
  );
}
