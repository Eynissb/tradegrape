import {
  Target, Coins, Sigma, Ratio, Scale, TrendingUp, TrendingDown, Flame, ArrowDownRight,
  Trophy, Skull, Timer, CalendarCheck, CalendarRange, Sparkles, ShieldCheck, ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { Bucket, DistributionBin, DayMetrics, ConsistencyAnalysis } from '@/lib/journal/analytics';
import { compactNumber, money, pnlColor, signed } from '@/app/app/_components/journal-ui';

/** Durée lisible : « 45 s », « 12 min », « 1 h 23 ». */
export function fmtDuration(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 90) return `${Math.round(sec)} s`;
  const min = Math.round(sec / 60);
  if (min < 90) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${h} h ${pad2(rem)}` : `${h} h`;
}
const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const SHORT_DATE_FR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
/** « 2026-07-27 » → « 27 juil. 26 ». Date stable en UTC. */
export function fmtShortDate(iso: string): string {
  const [y, m, day] = iso.split('-').map(Number);
  if (!y || !m || !day) return iso;
  return SHORT_DATE_FR.format(new Date(Date.UTC(y, m - 1, day)));
}


/** Carte de métrique : icône + libellé gris en haut, valeur très grosse en dessous. */
/** Symbole d'affichage d'une devise. Repli sur le code si non répertorié. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$', NZD: '$', JPY: '¥', CHF: 'CHF',
};
export const curSymbol = (currency: string): string => CURRENCY_SYMBOLS[currency] ?? currency;

/** Montant compact « 1 673,08 $ » (symbole plutôt que le code) pour les détails. */
export function moneySym(value: number, currency: string): string {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curSymbol(currency)}`;
}

/**
 * Montant financier pour une grosse valeur de carte : le NOMBRE en grand suivi
 * du SYMBOLE de la devise, dans la même couleur que le chiffre. Le symbole est
 * court, donc rien ne déborde d'une carte carrée.
 */
export function Amount({ value, signed: withSign, currency }: { value: number; signed?: boolean; currency: string }) {
  const s = value < 0 ? '−' : withSign ? '+' : '';
  const n = Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className="acct2-stat-amt num">
      {s}{n}<span className="acct2-stat-cur">{curSymbol(currency)}</span>
    </span>
  );
}

export function Stat({ label, value, color, sub, detail, title, wide, icon: Icon }: { label: string; value: React.ReactNode; color?: string; sub?: React.ReactNode; detail?: React.ReactNode; title?: string; wide?: boolean; icon?: LucideIcon }) {
  return (
    <div className={wide ? 'acct2-stat is-wide' : 'acct2-stat'}>
      <div className="acct2-stat-head">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>
      <div className="acct2-stat-body">
        <div className="acct2-stat-k" style={color ? { color } : undefined}>{value}</div>
      </div>
      {/* Sous-ligne TOUJOURS réservée, même vide : sans quoi les cartes sans
          sous-ligne (« Jours actifs ») sont plus courtes que celles qui en ont
          une (« Meilleur jour ») et les valeurs ne s'alignent plus entre elles. */}
      <div className="acct2-stat-foot">
        <div className="acct2-stat-sub" title={title}>{sub ?? ' '}</div>
        {detail !== undefined && detail !== null ? <div className="acct2-stat-detail">{detail}</div> : null}
      </div>
    </div>
  );
}

/** Tableau de ventilation catégorie → entrées / P&L net / réussite. */
export function Breakdown({
  title,
  buckets,
  currency,
  emptyHint,
  catHeader = 'Catégorie',
}: {
  title: string;
  buckets: Bucket[];
  currency: string;
  emptyHint: string;
  catHeader?: string;
}) {
  return (
    <div className="card acct2-bd">
      <h3 className="acct-rules-title">{title}</h3>
      {buckets.length === 0 ? (
        <p className="jsub">{emptyHint}</p>
      ) : (
        <div className="kv-list" role="table" aria-label={title}>
          {/* En-têtes : sans eux « ES · 12 · 58% » ne dit pas ce que valent 12 et 58%. */}
          <div className="kv-head" role="row">
            <span role="columnheader">{catHeader}</span>
            <span role="columnheader">P&L net</span>
          </div>
          {buckets.map((b) => (
            <div key={b.key} className="kv-row" role="row">
              <span className="kv-key" role="cell">
                {b.label}
                <span className="kv-meta"> · {b.entries} entrée{b.entries > 1 ? 's' : ''} · {b.winRate === null ? '—' : `${b.winRate}% réussite`}</span>
              </span>
              <span className="kv-val" role="cell" style={{ color: pnlColor(b.netPnl) }}>{signed(b.netPnl, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Histogramme de distribution du P&L (barres horizontales). */
export function DistributionBars({ bins }: { bins: DistributionBin[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="acct2-dist">
      {bins.map((b, i) => (
        <div key={i} className="acct2-dist-row">
          <span className="acct2-dist-label num">{compactNumber(b.from)} … {compactNumber(b.to)}</span>
          <span className="acct2-dist-track">
            <span className={`acct2-dist-bar ${b.from >= 0 ? 'is-win' : 'is-loss'}`} style={{ width: `${(b.count / max) * 100}%` }} />
          </span>
          <span className="acct2-dist-count num">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Score de discipline — % de jours tradés sans entorse (daily loss approché/
 * dépassé, ou jour cassant la cohérence). Lié aux règles réelles, pas une note
 * fourre-tout : le nombre a un sens littéral et se décompose en faits.
 */
export function DisciplineCard({ discipline }: { discipline: import('@/lib/journal/discipline').Discipline }) {
  const d = discipline;
  if (d.score === null) return null;

  // Ton du score : lime au-dessus de 80, ambre entre 50 et 80, rouge en dessous.
  const color = d.score >= 80 ? 'var(--win)' : d.score >= 50 ? 'var(--warn)' : 'var(--loss)';

  const faults: string[] = [];
  if (d.breached) faults.push(`${d.breached} jour${d.breached > 1 ? 's' : ''} au-delà du daily loss`);
  if (d.approached) faults.push(`${d.approached} l’a approché`);
  if (d.overSized) faults.push('1 jour casse la cohérence');

  return (
    <div className="card jdisc">
      <h3 className="acct-rules-title">Discipline</h3>
      <div className="jdisc-row">
        <div className="jdisc-score">
          <span className="jdisc-k num" style={{ color }}>{d.score}</span>
          <span className="jdisc-unit">%</span>
        </div>
        <p className="jsub jdisc-detail">
          {d.disciplinedDays} de tes {d.tradingDays} jours tradés respectent tes limites.
          {faults.length ? <> {faults.join(' · ')}.</> : ' Aucune entorse sur la période.'}
        </p>
      </div>
    </div>
  );
}

/** Grille de métriques communes (win rate, expectancy, R, profit factor…). */
export function MetricsGrid({
  metrics,
  currency,
  maxDrawdown,
}: {
  metrics: import('@/lib/journal/analytics').Metrics;
  currency: string;
  /** Repli max subi sur la période. Optionnel : toutes les vues n'ont pas de courbe. */
  maxDrawdown?: import('@/lib/journal/analytics').MaxDrawdown;
}) {
  const m = metrics;
  const profitFactor =
    m.profitFactor !== null ? m.profitFactor.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : m.grossWin > 0 ? '∞' : '—';

  /* Drawdown SUBI (pic→creux réel), à ne pas confondre avec le plancher de
     drawdown de la firm, qui est une limite contractuelle. */
  const dd = maxDrawdown;
  const ddSub = !dd || dd.amount === 0
    ? 'aucun repli sur la période'
    : [dd.pct !== null ? `${dd.pct.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%` : null,
       dd.peakDate && dd.troughDate ? `${fmtShortDate(dd.peakDate)} → ${fmtShortDate(dd.troughDate)}` : null].filter(Boolean).join(' · ');

  const decided = m.wins + m.losses;
  const winShare = decided ? Math.round((m.wins / decided) * 100) : null;
  // Ampleur de l'extrême rapportée à la moyenne — révèle un trade hors-norme.
  const bigWinX = m.avgWin > 0 && m.largestWin > 0 ? m.largestWin / m.avgWin : null;
  const bigLossX = m.avgLoss > 0 && m.largestLoss > 0 ? m.largestLoss / m.avgLoss : null;
  const x1 = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}×`;

  return (
    <div className="acct2-monthstats">
      <Stat
        icon={Target} label="Taux de réussite" wide
        value={m.winRate === null ? '—' : `${m.winRate}%`}
        sub={<><b className="num" style={{ color: 'var(--win)' }}>{m.wins} G</b> · <b className="num" style={{ color: 'var(--loss)' }}>{m.losses} P</b>{m.breakeven ? <> · {m.breakeven} neutre</> : null}</>}
        detail={`${m.entries} entrée${m.entries > 1 ? 's' : ''} au total`}
      />
      <Stat
        icon={Coins} label="P&L net" wide value={<Amount value={m.netPnl} signed currency={currency} />} color={pnlColor(m.netPnl)}
        sub={<><span className="num" style={{ color: 'var(--win)' }}>+{moneySym(m.grossWin, currency)}</span> de gains bruts</>}
        detail={<><span className="num" style={{ color: 'var(--loss)' }}>−{moneySym(m.grossLoss, currency)}</span> de pertes brutes</>}
      />
      <Stat
        icon={Sigma} label="Expectancy / entrée" value={<Amount value={m.expectancy} signed currency={currency} />} color={pnlColor(m.expectancy)}
        sub="Gain net espéré par entrée"
        detail={`sur ${m.entries} entrée${m.entries > 1 ? 's' : ''}`}
      />
      <Stat
        icon={Ratio} label="R moyen" value={m.avgR === null ? '—' : `${m.avgR}R`}
        sub="Expectancy en multiples de risque"
        detail={m.avgLoss ? <>1R = perte moyenne (<span className="num">{moneySym(m.avgLoss, currency)}</span>)</> : '1R = perte moyenne'}
      />
      <Stat
        icon={Scale} label="Profit factor" wide value={profitFactor}
        sub="Gains bruts ÷ pertes brutes"
        detail={<><span className="num" style={{ color: 'var(--win)' }}>+{moneySym(m.grossWin, currency)}</span> / <span className="num" style={{ color: 'var(--loss)' }}>−{moneySym(m.grossLoss, currency)}</span></>}
      />
      <Stat
        icon={TrendingUp} label="Gain moyen" value={<Amount value={m.avgWin} signed currency={currency} />} color={m.avgWin ? 'var(--win)' : undefined}
        sub={`sur ${m.wins} trade${m.wins > 1 ? 's' : ''} gagnant${m.wins > 1 ? 's' : ''}`}
        detail={winShare !== null ? `${winShare}% des trades décidés` : undefined}
      />
      <Stat
        icon={TrendingDown} label="Perte moyenne" value={<Amount value={-m.avgLoss} signed currency={currency} />} color={m.avgLoss ? 'var(--loss)' : undefined}
        sub={`sur ${m.losses} trade${m.losses > 1 ? 's' : ''} perdant${m.losses > 1 ? 's' : ''}`}
        detail={winShare !== null ? `${100 - winShare}% des trades décidés` : undefined}
      />
      <Stat
        icon={Trophy} label="Plus gros gain" value={<Amount value={m.largestWin} signed currency={currency} />} color={m.largestWin ? 'var(--win)' : undefined}
        sub="Meilleur trade unique"
        detail={bigWinX ? <>≈ <b className="num">{x1(bigWinX)}</b> le gain moyen</> : undefined}
      />
      <Stat
        icon={Skull} label="Plus grosse perte" value={<Amount value={-m.largestLoss} signed currency={currency} />} color={m.largestLoss ? 'var(--loss)' : undefined}
        sub="Pire trade unique"
        detail={bigLossX ? <>≈ <b className="num">{x1(bigLossX)}</b> la perte moyenne</> : undefined}
      />
      <Stat
        icon={Flame} label="Série gains / pertes" wide value={`${m.maxWinStreak} / ${m.maxLossStreak}`}
        sub={<><b className="num" style={{ color: 'var(--win)' }}>{m.maxWinStreak}</b> gains d’affilée · <b className="num" style={{ color: 'var(--loss)' }}>{m.maxLossStreak}</b> pertes</>}
        detail="plus longues séries de trades"
      />
      {m.avgDurationSec !== null ? (
        <Stat
          icon={Timer} label="Durée moyenne" value={fmtDuration(m.avgDurationSec)}
          sub="Temps en position"
          detail="trades détaillés horodatés"
        />
      ) : null}
      {maxDrawdown ? (
        <Stat
          icon={ArrowDownRight} label="Drawdown max subi" wide value={<Amount value={dd && dd.amount > 0 ? -dd.amount : 0} currency={currency} />} color={dd && dd.amount > 0 ? 'var(--loss)' : undefined}
          sub="Plus fort repli pic → creux réellement subi"
          detail={ddSub}
        />
      ) : null}
    </div>
  );
}

/**
 * Métriques au niveau du JOUR — Day Win %, jours gagnants/perdants, P&L
 * journalier moyen, meilleur/pire jour, séries de jours. Distinct du niveau
 * trade : on peut avoir 40 % de trades gagnants et 70 % de journées gagnantes.
 */
export function DayStats({ day, currency }: { day: DayMetrics; currency: string }) {
  const d = day;
  if (d.tradingDays === 0) return null;
  const dayShare = d.winningDays + d.losingDays ? Math.round((d.winningDays / (d.winningDays + d.losingDays)) * 100) : null;
  return (
    <div className="acct2-monthstats">
      <Stat
        icon={CalendarCheck} label="Jours gagnants" wide
        value={d.dayWinRate === null ? '—' : `${d.dayWinRate}%`}
        sub={<><b className="num" style={{ color: 'var(--win)' }}>{d.winningDays} G</b> · <b className="num" style={{ color: 'var(--loss)' }}>{d.losingDays} P</b>{d.breakevenDays ? <> · {d.breakevenDays} N</> : null}</>}
        detail={`sur ${d.tradingDays} jour${d.tradingDays > 1 ? 's' : ''} tradé${d.tradingDays > 1 ? 's' : ''}`}
      />
      <Stat
        icon={Coins} label="P&L journalier moyen" value={<Amount value={d.avgDailyPnl} signed currency={currency} />} color={pnlColor(d.avgDailyPnl)}
        sub="Résultat net d’une journée type"
        detail={`${d.tradingDays} jour${d.tradingDays > 1 ? 's' : ''} dans le calcul`}
      />
      <Stat
        icon={CalendarRange} label="Trades / jour" value={d.avgTradesPerDay === null ? '—' : String(d.avgTradesPerDay)}
        sub="Fréquence de trading"
        detail={`${d.tradingDays} jour${d.tradingDays > 1 ? 's' : ''} tradé${d.tradingDays > 1 ? 's' : ''}`}
      />
      <Stat
        icon={TrendingUp} label="Meilleur jour" value={d.bestDay ? <Amount value={d.bestDay.pnl} signed currency={currency} /> : '—'} color={d.bestDay ? pnlColor(d.bestDay.pnl) : undefined}
        sub="Journée la plus rentable"
        detail={d.bestDay ? fmtShortDate(d.bestDay.date) : undefined}
      />
      <Stat
        icon={TrendingDown} label="Pire jour" value={d.worstDay ? <Amount value={d.worstDay.pnl} signed currency={currency} /> : '—'} color={d.worstDay ? pnlColor(d.worstDay.pnl) : undefined}
        sub="Journée la plus lourde"
        detail={d.worstDay ? fmtShortDate(d.worstDay.date) : undefined}
      />
      <Stat
        icon={Flame} label="Série jours V / R" wide value={`${d.maxWinDayStreak} / ${d.maxLossDayStreak}`}
        sub={<><b className="num" style={{ color: 'var(--win)' }}>{d.maxWinDayStreak}</b> jours verts · <b className="num" style={{ color: 'var(--loss)' }}>{d.maxLossDayStreak}</b> rouges</>}
        detail={dayShare !== null ? `${dayShare}% de journées gagnantes` : undefined}
      />
    </div>
  );
}

/**
 * Analyse de cohérence — LA signature prop firm. On exécute la règle que les
 * concurrents se contentent de décrire : quelle part le meilleur jour pèse dans
 * le profit, si c'est conforme au seuil de la firm, et **combien de profit en
 * plus** rendrait le compte conforme. États lime/amber/red (jamais l'accent de
 * marque), la lisibilité du risque primant.
 */
export function ConsistencyCard({ consistency, currency }: { consistency: ConsistencyAnalysis; currency: string }) {
  const c = consistency;
  if (!c.applies || c.thresholdPct === null) return null;

  // Aucun gain encore : la règle ne peut pas être évaluée, on l'explique.
  if (c.bestDaySharePct === null || c.compliant === null) {
    return (
      <div className="card jcons">
        <h3 className="acct-rules-title">Cohérence · seuil {c.thresholdPct}%</h3>
        <p className="jsub">
          Aucun jour gagnant sur la période. La règle limite le meilleur jour à {c.thresholdPct}% de tes
          gains — elle s’évaluera dès ton premier jour vert.
        </p>
      </div>
    );
  }

  const ok = c.compliant;
  const color = ok ? 'var(--win)' : 'var(--loss)';
  const Icon = ok ? ShieldCheck : ShieldAlert;
  // Position du meilleur jour vs seuil, sur une échelle 0→100 % de part.
  const sharePos = Math.min(100, c.bestDaySharePct);
  const threshPos = Math.min(100, c.thresholdPct);

  return (
    <div className="card jcons">
      <h3 className="acct-rules-title">Cohérence · seuil {c.thresholdPct}%</h3>
      <div className="jcons-row">
        <div className="jcons-score">
          <Icon aria-hidden="true" style={{ color }} />
          <span className="jcons-k num" style={{ color }}>{c.bestDaySharePct}%</span>
          <span className="jcons-unit">du profit sur ton meilleur jour</span>
        </div>
        <span className={`jcons-badge ${ok ? 'is-ok' : 'is-bad'}`}>{ok ? 'Conforme' : 'Non conforme'}</span>
      </div>

      {/* Jauge : part du meilleur jour + repère du seuil. */}
      <div className="jcons-bar" role="img" aria-label={`Meilleur jour ${c.bestDaySharePct}% pour un seuil de ${c.thresholdPct}%`}>
        <span className="jcons-bar-fill" style={{ width: `${sharePos}%`, background: color }} />
        <span className="jcons-bar-threshold" style={{ left: `${threshPos}%` }} title={`Seuil ${c.thresholdPct}%`} />
      </div>

      <p className="jsub jcons-detail">
        {c.bestDay ? <>Ton meilleur jour ({c.bestDay.date}) pèse <b className="num">{signed(c.bestDay.pnl, currency)}</b> sur <b className="num">{money(c.grossWinningDays, currency)}</b> de gains. </> : null}
        {ok ? (
          <>Tu es sous le seuil de {c.thresholdPct}% — conforme.</>
        ) : (
          <>Pour passer sous {c.thresholdPct}%, il te faut <b className="num" style={{ color: 'var(--amber)' }}>{money(c.profitNeeded, currency)}</b> de profit en plus, réalisés sur d’<b>autres</b> jours.</>
        )}
      </p>
    </div>
  );
}

