import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { addPayoutCap, deletePayoutCap } from './actions';

export interface PayoutCapRow {
  id: string;
  cycle_from: number | null;
  cycle_to: number | null;
  max_amount: number | null;
  max_pct: number | null;
  min_profit: number | null;
  note: string | null;
}

const COLS_CAPS = '120px 110px 100px 120px minmax(0,1fr) 80px';

function cycleLabel(c: PayoutCapRow): string {
  const from = c.cycle_from ?? 1;
  if (c.cycle_to == null) return `payout ${from}+`;
  if (c.cycle_to === from) return `payout ${from}`;
  return `payouts ${from}–${c.cycle_to}`;
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v.toLocaleString('fr-FR')}${suffix}`);

/**
 * Plafonds de retrait par cycle d'une offre. Le moteur ne fige que le cap du
 * 1er cycle (cf. pickFirstCycleCap) ; les suivants alimenteront l'affichage
 * « plafonds par cycle » du comparateur.
 */
export default function PayoutCapsEditor({
  offerId,
  caps,
}: {
  offerId: string;
  caps: PayoutCapRow[];
}) {
  return (
    <fieldset className="admin-section">
      <legend>Plafonds de payout par cycle</legend>
      <p className="admin-sub" style={{ margin: '2px 0 12px' }}>
        Le moteur du journal applique le plafond du <strong>1er cycle</strong>. Les cycles
        suivants (le plafond qui monte au 3ᵉ, 5ᵉ payout…) sont conservés pour le comparateur.
      </p>

      {caps.length > 0 ? (
        <div className="table-scroll">
          <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_CAPS }}>
            <div className="data-head" role="row">
              <span role="columnheader">Cycle</span>
              <span role="columnheader">Max €</span>
              <span role="columnheader">Max %</span>
              <span role="columnheader">Objectif cycle</span>
              <span role="columnheader">Note</span>
              <span role="columnheader"></span>
            </div>
            {caps.map((c) => (
              <div key={c.id} className="data-row" role="row">
                <span role="cell" data-label="Cycle" className="admin-strong">{cycleLabel(c)}</span>
                <span role="cell" data-label="Max €" className="num">{fmt(c.max_amount)}</span>
                <span role="cell" data-label="Max %" className="num">{fmt(c.max_pct, '%')}</span>
                <span role="cell" data-label="Objectif cycle" className="num">{fmt(c.min_profit)}</span>
                <span role="cell" data-label="Note" style={{ color: 'var(--ink3)' }}>{c.note || '—'}</span>
                <span role="cell" className="data-actions">
                  <form action={deletePayoutCap}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="offer_id" value={offerId} />
                    <Button type="submit" variant="ghost" size="sm">Suppr.</Button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="admin-sub" style={{ margin: '0 0 12px' }}>Aucun plafond de cycle.</p>
      )}

      {/* Ajout d'un plafond */}
      <form action={addPayoutCap} className="cap-add mt-4">
        <input type="hidden" name="offer_id" value={offerId} />
        <Input name="cycle_from" label="Cycle de" type="number" defaultValue={1} width="sm" />
        <Input name="cycle_to" label="à (vide = +)" type="number" placeholder="∞" width="sm" />
        <Input name="max_amount" label="Max €" type="number" step="0.01" width="sm" />
        <Input name="max_pct" label="Max %" type="number" step="0.01" width="sm" />
        <Input name="min_profit" label="Objectif cycle" type="number" step="0.01" width="sm" />
        <Input name="note" label="Note" placeholder="ex : Standard" />
        <div className="cap-add-btn">
          <Button type="submit" variant="ghost">+ Ajouter le plafond</Button>
        </div>
      </form>
    </fieldset>
  );
}
