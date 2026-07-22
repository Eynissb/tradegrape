import Link from 'next/link';
import { monthKey, type DayCell, type MonthView } from '@/lib/journal/calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const GREEN = '56, 255, 176';
const RED = '255, 77, 94';

/**
 * Montant SIGNÉ à deux décimales (« +26,50 »). Rien à voir avec l'abréviation
 * des axes : le nom `compact` prêtait à confusion avec `compactNumber`, qui
 * abrège au contraire (« 12,4 k »). Deux décimales systématiques — un P&L de
 * 26,50 ne doit jamais s'afficher « 27 ».
 */
function signedAmount(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** « lun. 20 juil. » — construit en heure locale pour ne pas décaler d'un jour. */
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DAY_FMT.format(new Date(y, m - 1, d));
}

/**
 * Intensité du fond proportionnelle au montant (CLAUDE.md §11) : un jour à
 * +50 $ ne doit pas se lire comme un jour à +5 000 $. Renvoie un facteur
 * 0,3 → 1 appliqué UNIQUEMENT aux alphas du fond ; le dégradé d'angle et
 * l'arête teintée gardent leur structure. Plancher à 0,3 pour qu'une petite
 * journée reste lisible.
 */
function intensity(pnl: number | null, maxAbs: number): number | undefined {
  if (pnl === null || pnl === 0) return undefined;
  const mag = maxAbs > 0 ? Math.min(1, Math.abs(pnl) / maxAbs) : 0;
  return Number((0.3 + 0.7 * mag).toFixed(3));
}

function DayContent({ c, maxAbs }: { c: DayCell; maxAbs: number }) {
  const title = [
    c.pnl !== null ? `P&L ${signedAmount(c.pnl)}` : 'aucune entrée',
    c.trades ? `${c.trades} trade(s)` : '',
    c.dailyLoss === 'breached' ? 'daily loss dépassé' : c.dailyLoss === 'approached' ? 'daily loss approché' : '',
    c.isConsistencyBreaker ? 'jour qui casse la cohérence' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const win = c.pnl !== null && c.pnl > 0;
  const loss = c.pnl !== null && c.pnl < 0;
  const i = intensity(c.pnl, maxAbs);

  return (
    <div
      className={`jcal-cell${c.inMonth ? '' : ' is-out'}${c.weekend ? ' is-weekend' : ''}${win ? ' day--win' : ''}${loss ? ' day--loss' : ''}${c.dailyLoss === 'breached' ? ' is-dl-breach' : ''}${c.dailyLoss === 'approached' ? ' is-dl-approach' : ''}${c.isConsistencyBreaker ? ' is-breaker' : ''}`}
      style={i === undefined ? undefined : ({ ['--i' as string]: i } as React.CSSProperties)}
      title={title}
    >
      <div className="jcal-day">
        {c.day}
        {c.isConsistencyBreaker ? <span className="jcal-star" title="Casse la cohérence">★</span> : null}
      </div>
      {c.pnl !== null ? (
        <div className="jcal-pnl num" style={{ color: `rgb(${c.pnl >= 0 ? GREEN : RED})` }}>
          {signedAmount(c.pnl)}
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
  // Jours du mois porteurs d'information — la liste mobile n'affiche qu'eux.
  const activeDays = view.weeks
    .flatMap((w) => w.days)
    .filter((c) => c.inMonth && (c.pnl !== null || c.trades > 0));

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
            <div className={`jcal-total num${week.total >= 0 ? '' : ' is-neg'}${week.hasData ? '' : ' is-empty'}`}>
              {week.hasData ? signedAmount(week.total) : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Sous 640 px, la grille 7 colonnes devient illisible (cellule de 32 px,
          P&L tronqué) et un mois vide à 90 % n'apporte rien : on liste les
          seuls jours actifs. La grille reste la vue au-delà du seuil. */}
      <ul className="jcal-list">
        {activeDays.length === 0 ? (
          <li className="jcal-list-empty">Aucune entrée ce mois-ci.</li>
        ) : (
          activeDays.map((c) => (
            <li key={c.date}>
              <Link
                href={`/app/accounts/${accountId}?view=calendrier&month=${mk}&day=${c.date}`}
                className={`jcal-listrow${activeDay === c.date ? ' is-active' : ''}`}
              >
                <span className="jcal-listday">
                  {dayLabel(c.date)}
                  {c.isConsistencyBreaker ? <span className="jcal-star" title="Casse la cohérence">★</span> : null}
                </span>
                <span className="jcal-listmeta">
                  {c.trades > 0 ? <span className="num">{c.trades}t</span> : null}
                  {c.isTradingDay ? <span className="jcal-dot" style={{ background: `rgb(${GREEN})` }} title="Jour de trading validé" /> : null}
                  {c.dailyLoss !== 'none' ? (
                    <span
                      className="jcal-dot"
                      style={{ background: c.dailyLoss === 'breached' ? `rgb(${RED})` : 'var(--amber)' }}
                      title={c.dailyLoss === 'breached' ? 'Daily loss dépassé' : 'Daily loss approché'}
                    />
                  ) : null}
                </span>
                <span className="jcal-listpnl num" style={{ color: c.pnl === null ? 'var(--ink3)' : `rgb(${c.pnl >= 0 ? GREEN : RED})` }}>
                  {c.pnl === null ? '—' : signedAmount(c.pnl)}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>

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
