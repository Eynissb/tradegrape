import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import UISelect from '@/components/ui/Select';
import { addScalingStep, deleteScalingStep } from './actions';

export interface ScalingStepRow {
  id: string;
  profit_from: number | null;
  profit_to: number | null;
  max_minis: number | null;
  max_micros: number | null;
  phase: string;
}

const COLS_SCALING = 'minmax(0,1fr) 110px 100px 100px 110px 80px';

const fmt = (v: number | null) => (v == null ? '—' : v.toLocaleString('fr-FR'));
function rangeLabel(s: ScalingStepRow): string {
  const from = fmt(s.profit_from);
  return s.profit_to == null ? `≥ ${from}` : `${from} – ${fmt(s.profit_to)}`;
}

/**
 * Paliers de scaling d'une offre : contrats débloqués selon le profit cumulé.
 * Alimente le scaling_simulator (affichage) — pas le moteur de règles.
 */
export default function ScalingStepsEditor({
  offerId,
  steps,
}: {
  offerId: string;
  steps: ScalingStepRow[];
}) {
  return (
    <fieldset className="admin-section">
      <legend>Paliers de scaling (contrats débloqués)</legend>
      <p className="admin-sub" style={{ margin: '2px 0 12px' }}>
        Nombre de contrats autorisés selon le profit cumulé. Sert l’affichage du simulateur
        de scaling.
      </p>

      {steps.length > 0 ? (
        <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_SCALING }}>
            <div className="data-head" role="row">
              <span role="columnheader">Profit</span>
              <span role="columnheader">Minis</span>
              <span role="columnheader">Micros</span>
              <span role="columnheader">Phase</span>
              <span role="columnheader"></span>
              <span role="columnheader"></span>
            </div>
            {steps.map((s) => (
              <div key={s.id} className="data-row" role="row">
                <span role="cell" data-label="Profit" className="admin-strong num">{rangeLabel(s)}</span>
                <span role="cell" data-label="Minis" className="num">{fmt(s.max_minis)}</span>
                <span role="cell" data-label="Micros" className="num">{fmt(s.max_micros)}</span>
                <span role="cell" data-label="Phase">{s.phase}</span>
                <span role="cell"></span>
                <span role="cell" className="data-actions">
                  <form action={deleteScalingStep}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="offer_id" value={offerId} />
                    <Button type="submit" variant="ghost" size="sm">Suppr.</Button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="admin-sub" style={{ margin: '0 0 12px' }}>Aucun palier de scaling.</p>
      )}

      <form action={addScalingStep} className="cap-add mt-4">
        <input type="hidden" name="offer_id" value={offerId} />
        <Input name="profit_from" label="Profit à partir de" type="number" step="0.01" width="sm" mono />
        <Input name="profit_to" label="jusqu'à (vide = +)" type="number" step="0.01" width="sm" mono />
        <Input name="max_minis" label="Minis max" type="number" width="sm" mono />
        <Input name="max_micros" label="Micros max" type="number" width="sm" mono />
        <UISelect
          name="phase"
          label="Phase"
          defaultValue="funded"
          width="sm"
          options={[
            { value: 'funded', label: 'Financé' },
            { value: 'evaluation', label: 'Évaluation' },
          ]}
        />
        <div className="cap-add-btn">
          <Button type="submit" variant="ghost">+ Ajouter le palier</Button>
        </div>
      </form>
    </fieldset>
  );
}
