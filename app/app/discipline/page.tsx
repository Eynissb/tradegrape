import Link from 'next/link';
import { Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { rulesForStatus } from '@/lib/rules/phase';
import { computeDiscipline } from '@/lib/journal/discipline';
import { toEngineTrade, type DbTradeRow, type RulesSnapshot } from '@/lib/journal/snapshot';
import EmptyState from '@/components/ui/EmptyState';
import { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Discipline — Tradegrape' };

interface AccountRow {
  id: string;
  label: string | null;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
}

function scoreColor(s: number): string {
  if (s >= 85) return 'var(--lime)';
  if (s >= 70) return 'var(--lime)';
  if (s >= 50) return 'var(--amber)';
  return 'var(--red)';
}
function scoreLabel(s: number): string {
  if (s >= 85) return 'Excellent';
  if (s >= 70) return 'Solide';
  if (s >= 50) return 'À surveiller';
  return 'Fragile';
}

export default async function DisciplinePage() {
  const supabase = await createClient();

  const { data: accountsData } = await supabase
    .from('journal_accounts')
    .select('id, label, starting_balance, status, rules_snapshot')
    .order('created_at', { ascending: false })
    .returns<AccountRow[]>();

  const accounts = accountsData ?? [];
  const ids = accounts.map((a) => a.id);
  const tradesByAccount = new Map<string, DbTradeRow[]>();
  if (ids.length > 0) {
    const { data: trades } = await supabase
      .from('trades')
      .select('id, account_id, trade_date, closed_at, pnl, fees')
      .in('account_id', ids)
      .returns<(DbTradeRow & { account_id: string })[]>();
    for (const t of trades ?? []) {
      const list = tradesByAccount.get(t.account_id) ?? [];
      list.push(t);
      tradesByAccount.set(t.account_id, list);
    }
  }

  const rows = accounts.map((a) => {
    const snap = a.rules_snapshot;
    const trades = (tradesByAccount.get(a.id) ?? []).map(toEngineTrade);
    const disc = computeDiscipline(rulesForStatus(snap.rules, a.status), Number(a.starting_balance), trades);
    return { a, snap, disc };
  });

  const totTrading = rows.reduce((s, r) => s + r.disc.tradingDays, 0);
  const totDisc = rows.reduce((s, r) => s + r.disc.disciplinedDays, 0);
  const overall = totTrading > 0 ? Math.round((totDisc / totTrading) * 100) : null;

  const hasData = rows.some((r) => r.disc.tradingDays > 0);

  return (
    <main className="jwrap">
      <div className="jhead">
        <div>
          <h1 className="jh1">Discipline</h1>
          <p className="jsub">
            Un score concret : le pourcentage de tes journées tradées où tu as respecté tes règles.
            Jamais adossé au profit.
          </p>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={Target}
          title="Pas encore de journée à noter"
          description="Ajoute des entrées à tes comptes : ta discipline se calcule sur le respect du daily loss, de la cohérence et de la marge de drawdown — tes vraies règles."
          action={
            <Link href="/app/accounts" className={buttonClasses({ variant: 'secondary' })}>
              Voir mes comptes
            </Link>
          }
        />
      ) : (
        <>
          {overall !== null ? (
            <div className="disc-hero card">
              <div className="disc-hero-score" style={{ color: scoreColor(overall) }}>
                <span className="disc-hero-num num">{overall}</span>
                <span className="disc-hero-max">/100</span>
              </div>
              <div className="disc-hero-txt">
                <div className="disc-hero-grade" style={{ color: scoreColor(overall) }}>{scoreLabel(overall)}</div>
                <div className="disc-hero-sub">
                  <span className="num">{totDisc}</span> journées disciplinées sur <span className="num">{totTrading}</span>, tous comptes confondus.
                </div>
              </div>
            </div>
          ) : null}

          <div className="disc-list">
            {rows
              .filter((r) => r.disc.tradingDays > 0)
              .map(({ a, snap, disc }) => (
                <Link key={a.id} href={`/app/accounts/${a.id}`} className="disc-row card card-interactive">
                  <div className="disc-row-main">
                    <span className="disc-row-title">{a.label ?? 'Compte'}</span>
                    <span className="disc-row-meta">{snap.display?.firmName} · {snap.display?.planName}</span>
                  </div>

                  <div className="disc-row-flags">
                    {disc.breached > 0 ? (
                      <span className="disc-flag disc-flag--red">{disc.breached} daily loss dépassé{disc.breached > 1 ? 's' : ''}</span>
                    ) : null}
                    {disc.approached > 0 ? (
                      <span className="disc-flag disc-flag--amber">{disc.approached} approché{disc.approached > 1 ? 's' : ''}</span>
                    ) : null}
                    {disc.overSized > 0 ? (
                      <span className="disc-flag disc-flag--amber">cohérence en jeu</span>
                    ) : null}
                    {disc.breached === 0 && disc.approached === 0 && disc.overSized === 0 ? (
                      <span className="disc-flag disc-flag--ok">clean</span>
                    ) : null}
                  </div>

                  <div className="disc-row-score">
                    <span className="disc-bar">
                      <span style={{ width: `${disc.score ?? 0}%`, background: scoreColor(disc.score ?? 0) }} />
                    </span>
                    <span className="disc-row-num num" style={{ color: scoreColor(disc.score ?? 0) }}>
                      {disc.score}
                    </span>
                  </div>
                </Link>
              ))}
          </div>

          <p className="disc-note">
            Une journée est « disciplinée » si elle n’a pas approché ni dépassé le daily loss et n’est pas
            le jour qui casse ta cohérence.
          </p>
        </>
      )}
    </main>
  );
}
