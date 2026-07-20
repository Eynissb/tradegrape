import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { evaluateAccount } from '@/lib/rules/futures-engine';
import {
  toEngineTrade,
  type DbTradeRow,
  type RulesSnapshot,
} from '@/lib/journal/snapshot';
import { money, signed, StatusBadge, stateColor } from './_components/journal-ui';

export const metadata = { title: 'Mon journal — Tradawave' };

interface AccountRow {
  id: string;
  label: string | null;
  account_size: number;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
}

export default async function JournalHome() {
  const supabase = await createClient();

  const { data: accountsData } = await supabase
    .from('journal_accounts')
    .select('id, label, account_size, starting_balance, status, rules_snapshot')
    .order('created_at', { ascending: false })
    .returns<AccountRow[]>();

  const accounts = accountsData ?? [];

  // Tous les trades des comptes en une requête, regroupés par compte.
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

  return (
    <main className="jwrap">
      <div className="jhead">
        <div>
          <h1 className="jh1">Mes comptes</h1>
          <p className="jsub">
            Ajoute un compte, journalise, le moteur te place face aux règles en temps réel.
          </p>
        </div>
        <Link href="/app/accounts/new" className="btn-grad">
          + Ajouter un compte
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="glass jempty">
          <p>Aucun compte pour l’instant.</p>
          <p className="jsub mt-2">
            Choisis une offre du comparateur et le journal configure ses règles
            automatiquement.
          </p>
          <Link href="/app/accounts/new" className="btn-grad mt-5">
            Ajouter mon premier compte
          </Link>
        </div>
      ) : (
        <div className="jcards">
          {accounts.map((a) => {
            const snap = a.rules_snapshot;
            const trades = (tradesByAccount.get(a.id) ?? []).map(toEngineTrade);
            const evalr = evaluateAccount(snap.rules, Number(a.starting_balance), trades);
            const currency = snap.display?.currency ?? 'USD';

            return (
              <Link key={a.id} href={`/app/accounts/${a.id}`} className="jcard glass">
                <div className="jcard-head">
                  <div>
                    <div className="jcard-title">{a.label ?? 'Compte'}</div>
                    <div className="jcard-meta">
                      {snap.display?.firmName} · {snap.display?.planName}
                    </div>
                  </div>
                  <StatusBadge state={evalr.status} />
                </div>

                <div className="jcard-figs">
                  <div>
                    <div className="jcard-k num">{money(evalr.balance, currency)}</div>
                    <div className="jcard-l">Solde</div>
                  </div>
                  <div>
                    <div
                      className="jcard-k num"
                      style={{ color: stateColor(evalr.status) }}
                    >
                      {signed(evalr.netProfit, currency)}
                    </div>
                    <div className="jcard-l">P&L net</div>
                  </div>
                  <div>
                    <div className="jcard-k num">
                      {evalr.tradingDays.count}/{evalr.tradingDays.required}
                    </div>
                    <div className="jcard-l">Jours</div>
                  </div>
                </div>

                {evalr.profitTarget ? (
                  <div className="bar mt-4">
                    <span
                      style={{
                        width: `${Math.round(evalr.profitTarget.ratio * 100)}%`,
                        background: stateColor(evalr.profitTarget.state),
                      }}
                    />
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
