import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UISelect from '@/components/ui/Select';
import { STYLE_RULE_KEYS, STANCES } from '@/lib/catalog/style-rules';
import { saveStyleRules } from './actions';

export interface StyleRuleRow {
  rule_key: string;
  stance: string;
  threshold_note: string | null;
  detail: string | null;
}

/**
 * Éditeur des règles de style d'une firm : une ligne par style prédéfini
 * (catalogue partagé avec le comparateur). Position « — non spécifié » = la
 * ligne n'est pas enregistrée (ou supprimée). Un seul upsert groupé.
 */
export default function StyleRulesForm({
  firmId,
  rules,
}: {
  firmId: string;
  rules: StyleRuleRow[];
}) {
  const byKey = new Map(rules.map((r) => [r.rule_key, r]));
  const stanceOptions = [
    { value: '', label: '— non spécifié' },
    ...STANCES.map((s) => ({ value: s.value, label: s.label })),
  ];

  return (
    <form action={saveStyleRules} className="ds-form-wide">
      <input type="hidden" name="firm_id" value={firmId} />
      <fieldset className="admin-section">
        <legend>Règles de style</legend>
        <p className="admin-sub" style={{ margin: '2px 0 10px' }}>
          Position de la firm sur chaque style. Alimente le filtre « compatible avec mon style ».
        </p>

        <div className="stylerule-head" aria-hidden="true">
          <span>Style</span>
          <span>Position</span>
          <span>Seuil / condition</span>
          <span>Détail</span>
        </div>

        <div className="stylerule-list">
          {STYLE_RULE_KEYS.map((k) => {
            const cur = byKey.get(k.key);
            return (
              <div key={k.key} className="stylerule-row">
                <div className="stylerule-name">
                  <span className="stylerule-label">{k.label}</span>
                  <span className="stylerule-help">{k.help}</span>
                </div>
                <UISelect
                  name={`stance__${k.key}`}
                  defaultValue={cur?.stance ?? ''}
                  options={stanceOptions}
                  width="sm"
                />
                <Input
                  name={`threshold__${k.key}`}
                  defaultValue={cur?.threshold_note ?? ''}
                  placeholder="ex : signalé si >50% des profits sur trades ≤5s"
                />
                <Input
                  name={`detail__${k.key}`}
                  defaultValue={cur?.detail ?? ''}
                  placeholder="précision libre"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <Button type="submit">Enregistrer les règles de style</Button>
      </div>
    </form>
  );
}
