import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import {
  buildAggregateAnalytics,
  resolveRange,
  type AggregateTrade,
} from '@/lib/journal/analytics';
import { SETUP_TAGS, isSetupKey, tagLabel } from '@/lib/journal/tags';
import { Stat } from '@/app/app/_components/analytics-ui';
import { signed, pnlColor } from '@/app/app/_components/journal-ui';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { saveSetup, deleteSetup } from '@/app/app/actions';

export const metadata = { title: 'Setup — Playbook — Tradegrape' };

interface SetupRow {
  entry: string;
  management: string;
  invalidation: string;
}
interface AccountRow {
  id: string;
  label: string | null;
  rules_snapshot: RulesSnapshot;
}
interface TradeRow {
  account_id: string;
  trade_date: string;
  closed_at: string;
  pnl: number | string;
  fees: number | string | null;
  symbol: string | null;
  tags: string[] | null;
}

export default async function SetupEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ setup: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { setup } = await params;
  if (!isSetupKey(setup)) notFound();
  const { saved, error } = await searchParams;

  const label = SETUP_TAGS.find((s) => s.key === setup)!.label;
  const tagKey = `setup:${setup}`;

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: definition }, { data: accountsData }, { data: tradesData }] = await Promise.all([
    supabase
      .from('journal_setups')
      .select('entry, management, invalidation')
      .eq('tag_key', tagKey)
      .maybeSingle<SetupRow>(),
    supabase.from('journal_accounts').select('id, label, rules_snapshot').returns<AccountRow[]>(),
    supabase.from('trades').select('account_id, trade_date, closed_at, pnl, fees, symbol, tags').returns<TradeRow[]>(),
  ]);

  const accounts = accountsData ?? [];
  const labels = new Map(accounts.map((a) => [a.id, a.label ?? 'Compte']));
  const currency = accounts[0]?.rules_snapshot.display?.currency ?? 'USD';

  const allTrades: AggregateTrade[] = (tradesData ?? []).map((r) => ({
    id: '',
    tradeDate: r.trade_date,
    closedAt: r.closed_at,
    pnl: Number(r.pnl),
    fees: r.fees === null ? 0 : Number(r.fees),
    symbol: r.symbol ?? '',
    tags: r.tags ?? [],
    accountId: r.account_id,
    accountLabel: labels.get(r.account_id) ?? 'Compte',
  }));
  const range = resolveRange('all', today, allTrades);
  const { bySetup } = buildAggregateAnalytics({ allTrades, range });
  const perf = bySetup.find((b) => b.key === tagKey) ?? null;

  return (
    <main className="ui jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app/playbook" className="link-accent">Playbook</Link>{' / '}
        {tagLabel(tagKey)}
      </nav>

      {saved ? <div className="notice notice-info mt-4">Définition enregistrée.</div> : null}
      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      <div className="acct2-top mt-4">
        <h1 className="jh1">{label}</h1>
        <p className="jsub mt-1">
          Relié au tag <code className="jcode">{tagKey}</code>. Sa performance est lue depuis tes
          trades tagués — rien n’est recompté ici.
        </p>
      </div>

      {/* Performance réelle du setup, ou signal d'absence de données. */}
      {perf ? (
        <div className="acct2-monthstats jplay-figs mt-5">
          <Stat label="Entrées taguées" value={String(perf.entries)} />
          <Stat label="P&L net" value={signed(perf.netPnl, currency)} color={pnlColor(perf.netPnl)} />
          <Stat
            label="Taux de réussite"
            value={perf.winRate === null ? '—' : `${perf.winRate}%`}
            sub={perf.winRate === null ? 'entrées journalières' : 'trades décidés'}
          />
        </div>
      ) : (
        <p className="notice mt-5">
          Aucun trade tagué <code className="jcode">{tagKey}</code> pour l’instant : ce setup n’a pas
          encore de données. Sa définition ci-dessous restera un <strong>lien mort</strong> tant
          qu’aucun trade ne le porte.
        </p>
      )}

      <form action={saveSetup} className="card ds-form mt-6">
        <input type="hidden" name="setup" value={setup} />
        <Textarea
          id="entry"
          name="entry"
          label="Critères d’entrée"
          rows={4}
          defaultValue={definition?.entry ?? ''}
          placeholder="Ce qui doit être réuni pour prendre le trade."
        />
        <div className="mt-4">
          <Textarea
            id="management"
            name="management"
            label="Gestion en position"
            rows={4}
            defaultValue={definition?.management ?? ''}
            placeholder="Stop, prises partielles, déplacement au point mort…"
          />
        </div>
        <div className="mt-4">
          <Textarea
            id="invalidation"
            name="invalidation"
            label="Invalidation"
            rows={4}
            defaultValue={definition?.invalidation ?? ''}
            placeholder="Ce qui invalide le setup — on ne prend pas / on coupe."
          />
        </div>
        <div className="mt-5"><Button type="submit">Enregistrer</Button></div>
      </form>

      {definition ? (
        <form action={deleteSetup} className="jnote-delete mt-6">
          <input type="hidden" name="setup" value={setup} />
          <Button type="submit" variant="danger" size="sm">Effacer la définition</Button>
          <p className="jsub mt-2">Le tag et les trades qui le portent restent intacts.</p>
        </form>
      ) : null}

      <div className="mt-6">
        <Link href="/app/playbook" className="link-accent">← Retour au playbook</Link>
      </div>
    </main>
  );
}
