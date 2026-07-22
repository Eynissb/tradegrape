import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import {
  buildFinancialBalance,
  type FinAccount,
  type FinPayout,
  type FinPurchase,
} from '@/lib/journal/financial';
import { money, pnlColor, signed } from '@/app/app/_components/journal-ui';
import { Stat } from '@/app/app/_components/analytics-ui';

export const metadata = { title: 'Bilan financier — Tradegrape' };

/* En-tête et lignes sont deux grilles distinctes : colonnes déterministes
   pour qu'elles s'alignent (cf. tableau des trades). */
const COLS_BY_FIRM = 'minmax(0,1fr) 84px 116px 116px 116px';

interface AccountRow {
  id: string;
  status: string;
  rules_snapshot: RulesSnapshot;
}

export default async function BalancePage() {
  const supabase = await createClient();
  const [{ data: accountsData }, { data: purchasesData }, { data: payoutsData }] = await Promise.all([
    supabase.from('journal_accounts').select('id, status, rules_snapshot').returns<AccountRow[]>(),
    supabase.from('account_purchases').select('journal_account_id, kind, amount, purchased_at').returns<
      { journal_account_id: string; kind: string; amount: number | string; purchased_at: string }[]
    >(),
    supabase.from('journal_payouts').select('account_id, amount, received_at').returns<
      { account_id: string; amount: number | string; received_at: string | null }[]
    >(),
  ]);

  const accountRows = accountsData ?? [];
  const currencies = new Set(accountRows.map((a) => a.rules_snapshot.display?.currency ?? 'USD'));
  const currency = accountRows[0]?.rules_snapshot.display?.currency ?? 'USD';

  const accounts: FinAccount[] = accountRows.map((a) => ({
    id: a.id,
    status: a.status,
    firmName: a.rules_snapshot.display?.firmName ?? 'Firm',
  }));
  const purchases: FinPurchase[] = (purchasesData ?? []).map((p) => ({
    accountId: p.journal_account_id,
    kind: p.kind,
    amount: Number(p.amount),
    purchasedAt: p.purchased_at,
  }));
  const payouts: FinPayout[] = (payoutsData ?? []).map((p) => ({
    accountId: p.account_id,
    amount: Number(p.amount),
    receivedAt: p.received_at,
  }));

  const b = buildFinancialBalance({ accounts, purchases, payouts });

  return (
    <main className="jwrap jwrap-acct">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}Bilan financier
      </nav>
      <div className="acct2-top">
        <h1 className="jh1">Bilan financier</h1>
        <p className="jsub">Est-ce que tu gagnes réellement de l’argent avec les prop firms ? Tout compte confondu.</p>
      </div>

      {currencies.size > 1 ? (
        <div className="notice notice-warn mt-4">
          Devises mixtes ({[...currencies].join(', ')}) : montants agrégés en {currency} sans conversion.
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="card acct2-empty mt-6">Aucun compte. <Link href="/app/accounts/new" className="link-accent">Ajoute-en un</Link>.</div>
      ) : (
        <div className="acct2-analytics mt-6">
          {/* Résultat net — la réponse */}
          <div className="card jbal-hero">
            <div className="jbal-hero-k num" style={{ color: pnlColor(b.netResult) }}>{signed(b.netResult, currency)}</div>
            <div className="jbal-hero-l">Résultat net · {money(b.payoutsReceived, currency)} reçus − {money(b.totalSpent, currency)} dépensés</div>
          </div>

          {/* Chiffres clés */}
          <div className="card">
            <h3 className="acct-rules-title">Vue d’ensemble</h3>
            <div className="acct2-monthstats">
              <Stat label="Total dépensé" value={money(b.totalSpent, currency)} color="var(--danger)" />
              <Stat label="Payouts reçus" value={money(b.payoutsReceived, currency)} color="var(--ok)" />
              <Stat label="Taux de réussite" value={b.successRate === null ? '—' : `${b.successRate}%`} sub={`${b.fundedReached} financés · ${b.failed} échoués`} />
              <Stat label="Coût moyen d’un financé" value={b.avgCostPerFunded === null ? '—' : money(b.avgCostPerFunded, currency)} />
              <Stat label="Délai moyen 1er payout" value={b.avgDaysToFirstPayout === null ? '—' : `${b.avgDaysToFirstPayout} j`} />
              <Stat label="Comptes" value={`${b.accountsTotal}`} sub={`${b.active} en cours · ${b.passed} passés · ${b.failed} échoués`} />
            </div>
          </div>

          {/* Dépenses par type */}
          <div className="card">
            <h3 className="acct-rules-title">Dépenses par type</h3>
            <div className="acct2-monthstats">
              <Stat label="Challenges" value={money(b.spentByKind.challenge, currency)} />
              <Stat label="Resets" value={money(b.spentByKind.reset, currency)} />
              <Stat label="Activations" value={money(b.spentByKind.activation, currency)} />
            </div>
          </div>

          {/* Par firm */}
          <div className="card">
            <h3 className="acct-rules-title">Par firm</h3>
            <div className="table-scroll">
              <div className="data-list" role="table" style={{ ['--cols' as string]: COLS_BY_FIRM }}>
                <div className="data-head" role="row">
                  <span role="columnheader">Firm</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>Comptes</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>Dépensé</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>Payouts</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>Net</span>
                </div>
                {b.byFirm.map((f) => (
                  <div key={f.firm} className="data-row" role="row">
                    <span role="cell">{f.firm}</span>
                    <span role="cell" className="num" style={{ textAlign: 'right' }}>{f.accounts}</span>
                    <span role="cell" className="num" style={{ textAlign: 'right' }}>{money(f.spent, currency)}</span>
                    <span role="cell" className="num" style={{ textAlign: 'right' }}>{money(f.payouts, currency)}</span>
                    <span role="cell" className="num" style={{ textAlign: 'right', color: pnlColor(f.net) }}>{signed(f.net, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="jsub">
            Les coûts se saisissent dans les <strong>réglages de chaque compte</strong> (section « Coûts & payouts »).
            L’achat du challenge est pré-rempli au prix de l’offre à la création.
          </p>
        </div>
      )}
    </main>
  );
}
