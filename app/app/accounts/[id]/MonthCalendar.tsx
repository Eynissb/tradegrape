import Link from 'next/link';
import { monthKey, type DayCell, type MonthView } from '@/lib/journal/calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const GREEN = '56, 255, 176';
const RED = '255, 77, 94';

function compact(n: number): string {
  // Deux décimales systématiques : un P&L journalier de 26,50 ne doit jamais s'afficher « 27 ».
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cellBg(pnl: number | null, maxAbs: number): string {
  if (pnl === null || pnl === 0) return 'transparent';
  const mag = maxAbs > 0 ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
  const alpha = (0.1 + 0.45 * mag).toFixed(3);
  return `rgba(${pnl > 0 ? GREEN : RED}, ${alpha})`;
}

function DayContent({ c, maxAbs }: { c: DayCell; maxAbs: number }) {
  const title = [
    c.pnl !== null ? `P&L ${compact(c.pnl)}` : 'aucune entrée',
    c.trades ? `${c.trades} trade(s)` : '',
    c.dailyLoss === 'breached' ? 'daily loss dépassé' : c.dailyLoss === 'approached' ? 'daily loss approché' : '',
    c.isConsistencyBreaker ? 'jour qui casse la cohérence' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`jcal-cell${c.inMonth ? '' : ' is-out'}${c.weekend ? ' is-weekend' : ''}${c.dailyLoss === 'breached' ? ' is-dl-breach' : ''}${c.dailyLoss === 'approached' ? ' is-dl-approach' : ''}${c.isConsistencyBreaker ? ' is-breaker' : ''}`}
      style={{ background: cellBg(c.pnl, maxAbs) }}
      title={title}
    >
      <div className="jcal-day">
        {c.day}
        {c.isConsistencyBreaker ? <span className="jcal-star" title="Casse la cohérence">★</span> : null}
      </div>
      {c.pnl !== null ? (
        <div className="jcal-pnl num" style={{ color: `rgb(${c.pnl >= 0 ? GREEN : RED})` }}>
          {compact(c.pnl)}
        </div>
      ) : null}
      {c.trades > 0 ? (
        <div className="jcal-foot">
          <span className="jcal-trades num">{c.trades}t</span>
          <span className="jcal-dots">
            {c.isTradingDay ? <span className="jcal-dot" style={{ background: `rgb(${GREEN})` }} /> : null}
            {c.dailyLoss !== 'none' ? (
              <span
                className="jcal-dot"
                style={{ background: c.dailyLoss === 'breached' ? `rgb(${RED})` : 'var(--amber)' }}
              />
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function MonthCalendar({
  view,
  accountId,
  activeDay,
  addedDay,
  consistency,
}: {
  view: MonthView;
  accountId: string;
  activeDay?: string;
  addedDay?: string;
  consistency?: { date: string; sharePct: number; limitPct: number } | null;
}) {
  const mk = monthKey(view.year, view.month);

  return (
    <div className="jcal glass">
      <div className="jcal-head">
        <Link href={`/app/accounts/${accountId}?view=calendrier&month=${view.prev}`} className="jcal-nav" aria-label="Mois précédent">
          ‹
        </Link>
        <h2 className="jcal-title">{view.label}</h2>
        <Link href={`/app/accounts/${accountId}?view=calendrier&month=${view.next}`} className="jcal-nav" aria-label="Mois suivant">
          ›
        </Link>
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
            {week.days.map((c) => {
              const isActive = activeDay === c.date;
              const isAdded = addedDay === c.date && c.inMonth;
              const inner = <DayContent c={c} maxAbs={view.maxAbs} />;
              return c.inMonth ? (
                <Link
                  key={c.date}
                  href={`/app/accounts/${accountId}?view=calendrier&month=${mk}&day=${c.date}`}
                  className={`jcal-link${isActive ? ' is-active' : ''}${isAdded ? ' is-added' : ''}`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={c.date} className="jcal-link is-disabled">
                  {inner}
                </div>
              );
            })}
            <div className={`jcal-total num${week.total >= 0 ? '' : ' is-neg'}`}>
              {week.hasData ? compact(week.total) : ''}
            </div>
          </div>
        ))}
      </div>

      {consistency ? (
        <div className="jcal-consistency">
          <span className="jcal-star">★</span> Cohérence : le{' '}
          <strong>{consistency.date}</strong> pèse{' '}
          <span className="num" style={{ color: 'var(--amber)' }}>
            {consistency.sharePct.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%
          </span>{' '}
          du profit (max {consistency.limitPct}%). C’est ce jour qui bloque la règle.
        </div>
      ) : null}

      <div className="jcal-legend">
        <span><span className="jcal-dot" style={{ background: `rgb(${GREEN})` }} /> jour de trading</span>
        <span><span className="jcal-dot" style={{ background: 'var(--amber)' }} /> daily loss approché</span>
        <span><span className="jcal-dot" style={{ background: `rgb(${RED})` }} /> daily loss dépassé</span>
        <span><span className="jcal-star">★</span> casse la cohérence</span>
      </div>
    </div>
  );
}
