import Link from 'next/link';
import type { DayCell, MonthView } from '@/lib/journal/calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const GREEN = '56, 255, 176';
const RED = '255, 77, 94';

function signedAmount(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DAY_FMT.format(new Date(y, m - 1, d));
}

function intensity(pnl: number | null, maxAbs: number): number | undefined {
  if (pnl === null || pnl === 0) return undefined;
  const mag = maxAbs > 0 ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
  return Number((0.3 + 0.7 * mag).toFixed(3));
}

function DayContent({ c, maxAbs }: { c: DayCell; maxAbs: number }) {
  const win = c.pnl !== null && c.pnl > 0;
  const loss = c.pnl !== null && c.pnl < 0;
  const i = intensity(c.pnl, maxAbs);
  return (
    <div
      className={`jcal-cell${c.inMonth ? '' : ' is-out'}${c.weekend ? ' is-weekend' : ''}${win ? ' day--win' : ''}${loss ? ' day--loss' : ''}`}
      style={i === undefined ? undefined : ({ ['--i' as string]: i } as React.CSSProperties)}
    >
      <div className="jcal-day">{c.day}</div>
      {c.pnl !== null ? (
        <div className="jcal-pnl num" style={{ color: `rgb(${c.pnl >= 0 ? GREEN : RED})` }}>
          {signedAmount(c.pnl)}
        </div>
      ) : null}
      {c.trades > 0 ? (
        <div className="jcal-foot">
          <span className="jcal-trades num">{c.trades}t</span>
        </div>
      ) : null}
    </div>
  );
}

/** Calendrier mensuel AGRÉGÉ (lecture seule) : P&L de tous les comptes par jour.
 *  `basePath` : la page qui porte la navigation des mois (?month=…). */
export default function JournalCalendar({
  view,
  basePath = '/app/journal',
  total,
}: {
  view: MonthView;
  basePath?: string;
  /** Total P&L du mois affiché — montré sous le titre si fourni. */
  total?: number;
}) {
  const activeDays = view.weeks
    .flatMap((w) => w.days)
    .filter((c) => c.inMonth && (c.pnl !== null || c.trades > 0));

  return (
    <div className="jcal glass">
      <div className="jcal-head">
        <Link href={`${basePath}?month=${view.prev}`} className="jcal-nav" aria-label="Mois précédent">‹</Link>
        <div className="jcal-titlewrap">
          <h2 className="jcal-title">{view.label}</h2>
          {total !== undefined ? (
            <span className="jcal-total-cap num" style={{ color: total >= 0 ? 'rgb(56, 255, 176)' : 'rgb(255, 77, 94)' }}>
              {signedAmount(total)}
            </span>
          ) : null}
        </div>
        <Link href={`${basePath}?month=${view.next}`} className="jcal-nav" aria-label="Mois suivant">›</Link>
      </div>

      <div className="jcal-grid">
        <div className="jcal-row jcal-wds">
          {WEEKDAYS.map((w) => (
            <div key={w} className="jcal-wd">{w}</div>
          ))}
          <div className="jcal-wd jcal-wtot">Sem.</div>
        </div>

        {view.weeks.map((week, wi) => (
          <div key={wi} className="jcal-row jcal-week">
            {week.days.map((c) => (
              <div key={c.date} className={`jcal-link is-disabled${c.inMonth ? '' : ' is-out'}`}>
                <DayContent c={c} maxAbs={view.maxAbs} />
              </div>
            ))}
            <div className={`jcal-total num${week.total >= 0 ? '' : ' is-neg'}${week.hasData ? '' : ' is-empty'}`}>
              {week.hasData ? signedAmount(week.total) : ''}
            </div>
          </div>
        ))}
      </div>

      <ul className="jcal-list">
        {activeDays.length === 0 ? (
          <li className="jcal-list-empty">Aucune entrée ce mois-ci.</li>
        ) : (
          activeDays.map((c) => (
            <li key={c.date}>
              <div className="jcal-listrow">
                <span className="jcal-listday">{dayLabel(c.date)}</span>
                <span className="jcal-listmeta">
                  {c.trades > 0 ? <span className="num">{c.trades}t</span> : null}
                </span>
                <span className="jcal-listpnl num" style={{ color: c.pnl === null ? 'var(--ink3)' : `rgb(${c.pnl >= 0 ? GREEN : RED})` }}>
                  {c.pnl === null ? '—' : signedAmount(c.pnl)}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
