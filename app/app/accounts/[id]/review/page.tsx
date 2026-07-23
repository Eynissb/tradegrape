import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { toEngineTrade, type DbTradeRow, type RulesSnapshot } from '@/lib/journal/snapshot';
import { buildWeekReview, mondayOf } from '@/lib/journal/week-review';
import { rulesForStatus } from '@/lib/rules/phase';
import { money, pnlColor, signed } from '@/app/app/_components/journal-ui';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { saveReview } from '@/app/app/actions';

export const metadata = { title: 'Revue de la semaine — Tradegrape' };

interface AccountRow {
  id: string;
  label: string | null;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
}
interface TradeRow extends DbTradeRow {
  symbol: string | null;
  tags: string[] | null;
}

const QUESTIONS = [
  { name: 'went_well', label: 'Qu’est-ce qui a bien fonctionné cette semaine ?' },
  { name: 'what_cost', label: 'Qu’est-ce qui t’a coûté le plus ?' },
  { name: 'next_focus', label: 'Une règle que tu te fixes pour la semaine prochaine ?' },
] as const;

export default async function WeekReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string; saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { week: weekParam, saved, error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, starting_balance, status, rules_snapshot')
    .eq('id', id)
    .single<AccountRow>();
  if (!account) notFound();

  const { data: tradeRows } = await supabase
    .from('trades')
    .select('id, trade_date, closed_at, pnl, fees, symbol, tags')
    .eq('account_id', id)
    .returns<TradeRow[]>();

  const snap = account.rules_snapshot;
  const currency = snap.display?.currency ?? 'USD';
  const start = Number(account.starting_balance);

  const analyticsTrades = (tradeRows ?? []).map((t) => ({
    ...toEngineTrade(t),
    symbol: t.symbol ?? '',
    tags: t.tags ?? [],
  }));

  const week = mondayOf(weekParam ?? today);
  // Règles effectives : la revue d'un compte financé doit lire le drawdown durci.
  const review = buildWeekReview(
    rulesForStatus(snap.rules, account.status),
    start,
    analyticsTrades,
    week,
  );

  // Réponses déjà enregistrées. La table peut ne pas encore exister (migration
  // 0008 non appliquée) : on dégrade proprement en formulaire vierge.
  let answers: Record<string, string> = {};
  const { data: saved0 } = await supabase
    .from('journal_reviews')
    .select('answers')
    .eq('account_id', id)
    .eq('week_start', review.weekStart)
    .maybeSingle<{ answers: Record<string, string> }>();
  if (saved0?.answers) answers = saved0.answers;

  const d = review.discipline;
  const disciplineColor =
    d.score === null ? undefined : d.score >= 80 ? 'var(--win)' : d.score >= 50 ? 'var(--warn)' : 'var(--loss)';

  return (
    <main className="ui jwrap jwrap-acct">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}
        <Link href={`/app/accounts/${id}`} className="link-accent">{account.label ?? 'Compte'}</Link>{' / '}
        Revue de la semaine
      </nav>

      <div className="acct2-top jreview-top">
        <div>
          <h1 className="jh1">Revue de la semaine</h1>
          <p className="jsub mt-1">{review.label}</p>
        </div>
        <div className="jreview-nav">
          <Link href={`/app/accounts/${id}/review?week=${review.prevWeek}`} className="jcal-nav" aria-label="Semaine précédente"><ChevronLeft aria-hidden="true" /></Link>
          {review.weekStart < mondayOf(today) ? (
            <Link href={`/app/accounts/${id}/review?week=${review.nextWeek}`} className="jcal-nav" aria-label="Semaine suivante"><ChevronRight aria-hidden="true" /></Link>
          ) : (
            <span className="jcal-nav is-disabled" aria-hidden="true"><ChevronRight /></span>
          )}
        </div>
      </div>

      {saved ? <div className="notice notice-info mt-4">Revue enregistrée.</div> : null}
      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      {review.entries === 0 ? (
        <div className="card empty mt-6">
          <div className="empty-icon"><CalendarRange aria-hidden="true" /></div>
          <p className="empty-title">Aucune entrée cette semaine</p>
          <p className="empty-desc">Change de semaine avec les flèches, ou reviens après avoir tradé.</p>
        </div>
      ) : (
        <>
          {/* Synthèse chiffrée — sous-cartes de niveau 2. */}
          <div className="card mt-6">
            <h3 className="acct-rules-title">La semaine en chiffres</h3>
            <div className="acct2-monthstats jreview-stats">
              <Stat label="P&L de la semaine" value={signed(review.pnl, currency)} color={pnlColor(review.pnl)} />
              <Stat label="Jours tradés" value={String(review.tradingDays)} sub={`${review.entries} entrée${review.entries > 1 ? 's' : ''}`} />
              <Stat label="Taux de réussite" value={review.winRate === null ? '—' : `${review.winRate}%`} />
              <Stat
                label="Discipline"
                value={d.score === null ? '—' : `${d.score}%`}
                color={disciplineColor}
                sub={d.score === null ? undefined : `${d.disciplinedDays}/${d.tradingDays} jours propres`}
              />
              <Stat
                label="Meilleur jour"
                value={review.bestDay ? signed(review.bestDay.pnl, currency) : '—'}
                color={review.bestDay ? pnlColor(review.bestDay.pnl) : undefined}
                sub={review.bestDay?.date}
              />
              <Stat
                // « Pire jour » n'a de sens que s'il y a eu une perte. Sur une
                // semaine tout en vert, c'est le plus petit GAIN, pas une perte.
                label={review.worstDay && review.worstDay.pnl < 0 ? 'Pire jour' : 'Plus petit gain'}
                value={review.worstDay ? signed(review.worstDay.pnl, currency) : '—'}
                color={review.worstDay ? pnlColor(review.worstDay.pnl) : undefined}
                sub={review.worstDay?.date}
              />
            </div>
          </div>

          {/* Synthèse guidée — réponses libres, persistées. */}
          <form action={saveReview} className="card jreview-form mt-6">
            <input type="hidden" name="account_id" value={id} />
            <input type="hidden" name="week_start" value={review.weekStart} />
            <h3 className="acct-rules-title">Ta synthèse</h3>
            {QUESTIONS.map((q) => (
              <Textarea key={q.name} id={q.name} name={q.name} label={q.label} rows={3} defaultValue={answers[q.name] ?? ''} />
            ))}
            <div className="mt-4"><Button type="submit">Enregistrer la revue</Button></div>
          </form>
        </>
      )}

      <div className="mt-6">
        <Link href={`/app/accounts/${id}`} className="link-accent">← Retour au compte</Link>
      </div>
    </main>
  );
}

/** Sous-carte de niveau 2 — valeur en gros, libellé en dessous. */
function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="acct2-stat">
      <div className="acct2-stat-head"><span>{label}</span></div>
      <div className="acct2-stat-k" style={color ? { color } : undefined}>{value}</div>
      <div className="acct2-stat-sub" title={sub ?? undefined}>{sub ?? ' '}</div>
    </div>
  );
}
