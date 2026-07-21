import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import {
  deleteAccount,
  saveAccountCommission,
  saveAccountGeneral,
  saveAccountRules,
} from '@/app/app/actions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Button, { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Paramètres du compte — Tradegrape' };

const STATUS_OPTIONS = [
  { value: 'evaluation', label: 'Évaluation' },
  { value: 'funded', label: 'Financé' },
  { value: 'passed', label: 'Passé' },
  { value: 'failed', label: 'Échoué' },
  { value: 'archived', label: 'Archivé' },
];
const DRAWDOWN_OPTIONS = [
  { value: 'EOD', label: 'EOD — plus haut de clôture' },
  { value: 'TRAIL', label: 'TRAIL — plus haut intraday' },
  { value: 'STATIC', label: 'STATIC — plancher fixe' },
];

interface AccountRow {
  id: string;
  label: string | null;
  status: string;
  offer_id: string | null;
  rules_snapshot: RulesSnapshot;
  commission_per_contract: number | null;
}

const v = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));

export default async function AccountSettings({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, status, offer_id, rules_snapshot, commission_per_contract')
    .eq('id', id)
    .single<AccountRow>();
  if (!account) notFound();

  const currency = account.rules_snapshot.display?.currency ?? 'USD';
  const rules = account.rules_snapshot.rules;
  const isCustom = account.offer_id === null;

  const { count } = await supabase
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)
    .eq('source', 'csv');
  const importedCount = count ?? 0;

  return (
    <main className="jwrap jwrap-narrow">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}
        <Link href={`/app/accounts/${id}`} className="link-accent">{account.label ?? 'Compte'}</Link>{' / '}
        Paramètres
      </nav>
      <h1 className="jh1">Paramètres du compte</h1>
      <p className="jsub mt-1">Tout ce qui concerne ce challenge précis. Les réglages personnels sont dans <Link href="/settings" className="link-accent">tes préférences</Link>.</p>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}
      {saved ? <div className="notice notice-info mt-4">Enregistré.</div> : null}

      {/* Général */}
      <form action={saveAccountGeneral} className="card ds-form mt-6">
        <input type="hidden" name="id" value={account.id} />
        <h2 className="acct-rules-title">Général</h2>
        <Input id="label" name="label" label="Nom du compte" required defaultValue={account.label ?? ''} width="md" placeholder="Lucid 50K — Éval" />
        <div className="mt-4">
          <Select name="status" label="Statut" defaultValue={account.status} options={STATUS_OPTIONS} width="sm" />
        </div>
        <div className="mt-5"><Button type="submit">Enregistrer</Button></div>
      </form>

      {/* Commissions */}
      <form action={saveAccountCommission} id="commissions" className="card ds-form mt-6">
        <input type="hidden" name="id" value={account.id} />
        <h2 className="acct-rules-title">Commissions</h2>
        <p className="jsub" style={{ marginBottom: '1rem' }}>
          Commission par contrat aller-retour, appliquée aux imports sans colonne de frais
          (Tradovate, Apex…). Le moteur calcule la progression vers l’objectif sur le net —
          renseigner ce taux corrige la surestimation du P&L. Vide = non renseignée.
        </p>
        <Input
          id="commission_per_contract"
          name="commission_per_contract"
          label="Commission par contrat aller-retour"
          type="number"
          step="0.0001"
          min="0"
          width="sm"
          mono
          suffix={`${currency}/contrat`}
          defaultValue={v(account.commission_per_contract)}
          placeholder="3.64"
        />
        {importedCount > 0 ? (
          <div className="mt-4">
            <Checkbox
              name="apply_existing"
              label={`Recalculer les frais des ${importedCount} trade(s) déjà importé(s) avec ce taux`}
              defaultChecked={account.commission_per_contract == null}
            />
          </div>
        ) : null}
        <div className="mt-5"><Button type="submit">Enregistrer</Button></div>
      </form>

      {/* Règles — compte personnalisé uniquement */}
      {isCustom ? (
        <form action={saveAccountRules} className="card ds-form mt-6">
          <input type="hidden" name="id" value={account.id} />
          <h2 className="acct-rules-title">Règles du challenge</h2>
          <p className="jsub" style={{ marginBottom: '1rem' }}>
            Compte personnalisé (firm non listée) : corrige ici les règles saisies à la création.
            Le moteur recalcule aussitôt jauges et payout.
          </p>
          <div className="admin-grid">
            <Select name="drawdown_type" label="Type de drawdown" defaultValue={rules.drawdownType} options={DRAWDOWN_OPTIONS} />
            <Input id="drawdown_amount" name="drawdown_amount" label={`Montant drawdown (${currency})`} type="number" step="0.01" required mono defaultValue={v(rules.drawdownAmount)} />
            <Input id="profit_target" name="profit_target" label={`Objectif de profit (${currency})`} type="number" step="0.01" mono defaultValue={v(rules.profitTarget)} />
            <Input id="daily_loss_limit" name="daily_loss_limit" label={`Perte journalière max (${currency})`} type="number" step="0.01" mono defaultValue={v(rules.dailyLossLimit)} />
            <Input id="consistency_pct" name="consistency_pct" label="Cohérence (%)" type="number" step="0.01" mono defaultValue={v(rules.consistencyPct)} />
            <Input id="min_trading_days" name="min_trading_days" label="Jours de trading min" type="number" mono defaultValue={v(rules.minTradingDays)} />
          </div>
          <div className="mt-5"><Button type="submit">Enregistrer les règles</Button></div>
        </form>
      ) : (
        <div className="card mt-6">
          <h2 className="acct-rules-title">Règles du challenge</h2>
          <p className="jsub">
            Ce compte suit une offre du catalogue ({account.rules_snapshot.display?.firmName} ·{' '}
            {account.rules_snapshot.display?.planName}). Ses règles sont figées au snapshot et ne
            se modifient pas à la main.
          </p>
        </div>
      )}

      {/* Zone de danger */}
      <div className="card mt-6 jdanger">
        <h2 className="acct-rules-title" style={{ color: 'var(--danger)' }}>Zone de danger</h2>
        <p className="jsub" style={{ marginBottom: '1rem' }}>
          Supprime définitivement ce compte et tout son historique de trades. Irréversible.
        </p>
        <form action={deleteAccount}>
          <input type="hidden" name="id" value={account.id} />
          <Button type="submit" variant="danger" size="sm">Supprimer le compte</Button>
        </form>
      </div>

      <div className="mt-6">
        <Link href={`/app/accounts/${id}`} className={buttonClasses({ variant: 'ghost' })}>Retour au compte</Link>
      </div>
    </main>
  );
}
