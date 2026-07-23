import Link from 'next/link';
import Button, { buttonClasses } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { addPayoutCap, updatePayoutCap, deletePayoutCap } from './actions';

export interface PayoutCapRow {
  id: string;
  cycle_from: number | null;
  cycle_to: number | null;
  max_amount: number | null;
  max_pct: number | null;
  min_profit: number | null;
  note: string | null;
  variant: string | null;
  split_pct: number | null;
  consistency_pct: number | null;
  min_profit_days: number | null;
  daily_threshold: number | null;
}

const COLS_CAPS = '110px 110px 100px 100px 110px 90px 100px minmax(0,1fr) 80px';

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
  editingId,
}: {
  offerId: string;
  caps: PayoutCapRow[];
  /** Ligne en cours de modification (paramètre `edit_cap` de l'URL). */
  editingId?: string;
}) {
  const editing = editingId ? caps.find((c) => c.id === editingId) ?? null : null;
  const v = (x: number | string | null | undefined) => (x === null || x === undefined ? '' : String(x));

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
              <span role="columnheader">Chemin</span>
              <span role="columnheader">Cycle</span>
              <span role="columnheader">Max €</span>
              <span role="columnheader">Max %</span>
              <span role="columnheader">Objectif cycle</span>
              <span role="columnheader">Split</span>
              <span role="columnheader">Cohérence</span>
              <span role="columnheader">Note</span>
              <span role="columnheader"></span>
            </div>
            {caps.map((c) => (
              <div
                key={c.id}
                className={`data-row${c.id === editingId ? ' is-editing' : ''}`}
                role="row"
              >
                <span role="cell" data-label="Chemin" className="admin-strong">{c.variant || 'unique'}</span>
                <span role="cell" data-label="Cycle" className="num">{cycleLabel(c)}</span>
                <span role="cell" data-label="Max €" className="num">{fmt(c.max_amount)}</span>
                <span role="cell" data-label="Max %" className="num">{fmt(c.max_pct, '%')}</span>
                <span role="cell" data-label="Objectif cycle" className="num">{fmt(c.min_profit)}</span>
                <span role="cell" data-label="Split" className="num">{fmt(c.split_pct, '%')}</span>
                <span role="cell" data-label="Cohérence" className="num">{fmt(c.consistency_pct, '%')}</span>
                <span role="cell" data-label="Note" style={{ color: 'var(--ink3)' }}>
                  {[c.note, c.min_profit_days != null ? `${c.min_profit_days} j` : null,
                    c.daily_threshold != null ? `seuil ${fmt(c.daily_threshold)}` : null]
                    .filter(Boolean).join(' · ') || '—'}
                </span>
                <span role="cell" className="data-actions">
                  <Link
                    href={`/admin/offers/${offerId}?edit_cap=${c.id}#caps`}
                    className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                  >
                    Éditer
                  </Link>
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
      {/* Un seul formulaire, deux modes : ajout, ou modification d'une ligne
          existante (pré-remplie). `key` force React à re-monter les champs quand
          on passe d'une ligne à l'autre — sinon les valeurs précédentes restent. */}
      <form
        key={editing?.id ?? 'new'}
        action={editing ? updatePayoutCap : addPayoutCap}
        className="cap-add mt-4"
        id="caps"
      >
        <input type="hidden" name="offer_id" value={offerId} />
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <Input name="variant" label="Chemin" placeholder="standard / consistency" width="sm"
               defaultValue={v(editing?.variant)}
               hint="Vide si l'offre n'a qu'un seul chemin de payout." />
        <Input name="cycle_from" label="Cycle de" type="number" width="sm"
               defaultValue={editing ? v(editing.cycle_from) : 1} />
        <Input name="cycle_to" label="à (vide = +)" type="number" placeholder="∞" width="sm"
               defaultValue={v(editing?.cycle_to)} />
        <Input name="max_amount" label="Max €" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.max_amount)} />
        <Input name="max_pct" label="Max %" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.max_pct)} />
        <Input name="min_profit" label="Objectif cycle" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.min_profit)} />
        <Input name="split_pct" label="Split %" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.split_pct)} />
        <Input name="consistency_pct" label="Cohérence %" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.consistency_pct)} />
        <Input name="min_profit_days" label="Jours requis" type="number" width="sm"
               defaultValue={v(editing?.min_profit_days)} />
        <Input name="daily_threshold" label="Seuil jour" type="number" step="0.01" width="sm"
               defaultValue={v(editing?.daily_threshold)} />
        <Input name="note" label="Note" placeholder="ex : Standard" defaultValue={v(editing?.note)} />
        <div className="cap-add-btn">
          <Button type="submit" variant={editing ? 'primary' : 'ghost'}>
            {editing ? 'Enregistrer le plafond' : '+ Ajouter le plafond'}
          </Button>
          {editing ? (
            <Link
              href={`/admin/offers/${offerId}#caps`}
              className={buttonClasses({ variant: 'ghost' })}
              style={{ marginLeft: 10 }}
            >
              Annuler
            </Link>
          ) : null}
        </div>
      </form>
    </fieldset>
  );
}
