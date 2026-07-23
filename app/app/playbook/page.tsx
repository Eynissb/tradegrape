import Link from 'next/link';
import { BookMarked, Pencil, FileWarning, Unlink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import {
  buildAggregateAnalytics,
  resolveRange,
  type AggregateTrade,
} from '@/lib/journal/analytics';
import { SETUP_TAGS } from '@/lib/journal/tags';
import { buildPlaybook, type SetupDefinition, type PlaybookRow } from '@/lib/journal/playbook';
import { Stat } from '@/app/app/_components/analytics-ui';
import { signed, pnlColor } from '@/app/app/_components/journal-ui';
import Badge from '@/components/ui/Badge';
import SetupPicker from './SetupPicker';

export const metadata = { title: 'Playbook — Tradegrape' };

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
interface SetupRow {
  tag_key: string;
  entry: string;
  management: string;
  invalidation: string;
}

export default async function PlaybookPage() {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: accountsData }, { data: tradesData }, { data: setupsData }] = await Promise.all([
    supabase.from('journal_accounts').select('id, label, rules_snapshot').returns<AccountRow[]>(),
    supabase.from('trades').select('account_id, trade_date, closed_at, pnl, fees, symbol, tags').returns<TradeRow[]>(),
    // Table 0010 : peut ne pas encore exister → dégrade en aucune définition.
    supabase.from('journal_setups').select('tag_key, entry, management, invalidation').returns<SetupRow[]>(),
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

  // Performance par setup, tous comptes confondus, sur tout l'historique.
  const range = resolveRange('all', today, allTrades);
  const { bySetup } = buildAggregateAnalytics({ allTrades, range });

  const definitions: SetupDefinition[] = (setupsData ?? []).map((s) => ({
    tagKey: s.tag_key,
    entry: s.entry,
    management: s.management,
    invalidation: s.invalidation,
  }));

  const pb = buildPlaybook({ catalog: SETUP_TAGS, definitions, buckets: bySetup });

  // Le menu déroulant ne propose que les setups non encore documentés.
  const toDocument = pb.rows
    .filter((r) => r.definition === null)
    .map((r) => ({ key: r.key, label: r.label }));

  // La liste montre les setups « vivants » (documentés OU tradés) ; les
  // emplacements vides restent accessibles via le menu déroulant.
  const shown = pb.rows.filter((r) => r.status !== 'empty');

  return (
    <main className="ui jwrap jwrap-acct">
      <div className="acct2-top">
        <h1 className="jh1">Playbook</h1>
        <p className="jsub mt-1">
          Documente tes setups — critères d’entrée, gestion, invalidation — et confronte-les à
          leur performance réelle, tirée de tes trades tagués. Un setup se relie à un tag
          <code className="jcode"> setup:</code> existant : pas de nom libre.
        </p>
      </div>

      {(pb.undocumented > 0 || pb.neverTraded > 0) ? (
        <div className="notice notice-warn mt-4">
          {pb.undocumented > 0 ? (
            <span>
              {pb.undocumented} setup{pb.undocumented > 1 ? 's' : ''} tradé{pb.undocumented > 1 ? 's' : ''} sans définition.
            </span>
          ) : null}{' '}
          {pb.neverTraded > 0 ? (
            <span>
              {pb.neverTraded} définition{pb.neverTraded > 1 ? 's' : ''} jamais tradée{pb.neverTraded > 1 ? 's' : ''}.
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Documenter un setup — menu déroulant vers les tags prédéfinis. */}
      <div className="card jplay-add mt-6">
        <h3 className="acct-rules-title">Documenter un setup</h3>
        <SetupPicker options={toDocument} />
      </div>

      {shown.length === 0 ? (
        <div className="card acct2-empty mt-6">
          <BookMarked aria-hidden="true" style={{ opacity: 0.5 }} /> Aucun setup documenté ni tradé.
          Choisis-en un ci-dessus pour commencer.
        </div>
      ) : (
        <div className="jplay-list mt-6">
          {shown.map((row) => (
            <SetupCard key={row.key} row={row} currency={currency} />
          ))}
        </div>
      )}
    </main>
  );
}

/** Une carte par setup vivant : définition + performance réelle, ou alerte de lien mort. */
function SetupCard({ row, currency }: { row: PlaybookRow; currency: string }) {
  const editHref = `/app/playbook/${row.key}`;
  return (
    <section className="card jplay-card">
      <header className="jplay-head">
        <h3 className="jplay-name">{row.label}</h3>
        {row.status === 'undocumented' ? (
          <Badge variant="warn" icon={FileWarning}>À documenter</Badge>
        ) : row.status === 'never_traded' ? (
          <Badge variant="neutral" icon={Unlink}>Jamais tradé</Badge>
        ) : (
          <Badge variant="neutral">Documenté</Badge>
        )}
      </header>

      {/* Performance réelle — sous-cartes niveau 2, ou signal de lien mort. */}
      {row.perf ? (
        <div className="acct2-monthstats jplay-figs">
          <Stat label="Entrées taguées" value={String(row.perf.entries)} />
          <Stat
            label="P&L net"
            value={signed(row.perf.netPnl, currency)}
            color={pnlColor(row.perf.netPnl)}
          />
          <Stat
            label="Taux de réussite"
            value={row.perf.winRate === null ? '—' : `${row.perf.winRate}%`}
            sub={row.perf.winRate === null ? 'entrées journalières' : 'trades décidés'}
          />
        </div>
      ) : (
        <p className="notice jplay-deadlink">
          Défini mais <strong>jamais tradé</strong> : aucun trade tagué{' '}
          <code className="jcode">{row.tagKey}</code>. Tague un trade avec ce setup pour voir sa
          performance ici.
        </p>
      )}

      {/* Définition — ou invitation à l'écrire. */}
      {row.definition ? (
        <dl className="jplay-def">
          <DefLine label="Entrée" value={row.definition.entry} />
          <DefLine label="Gestion" value={row.definition.management} />
          <DefLine label="Invalidation" value={row.definition.invalidation} />
        </dl>
      ) : (
        <p className="notice notice-warn jplay-deadlink">
          Ce setup est <strong>tradé mais non documenté</strong>. Écris ses critères d’entrée, sa
          gestion et son invalidation pour mesurer ce qui marche vraiment.
        </p>
      )}

      <div className="jplay-actions">
        <Link href={editHref} className="btn btn-ghost btn-sm">
          <Pencil aria-hidden="true" />
          {row.definition ? 'Modifier la définition' : 'Documenter ce setup'}
        </Link>
      </div>
    </section>
  );
}

function DefLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="jplay-defline">
      <dt className="jplay-deft">{label}</dt>
      <dd className="jplay-defv">{value.trim() ? value : <span className="jplay-defempty">— non renseigné</span>}</dd>
    </div>
  );
}
