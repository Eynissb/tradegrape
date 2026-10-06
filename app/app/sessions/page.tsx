import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import EmptyState from '@/components/ui/EmptyState';
import { buttonClasses } from '@/components/ui/Button';

export const metadata = { title: 'Sessions — Tradegrape' };

interface ReviewRow {
  id: string;
  account_id: string;
  week_start: string;
  answers: Record<string, string> | null;
  updated_at: string;
}
interface AccountRow {
  id: string;
  label: string | null;
  rules_snapshot: RulesSnapshot;
}

const WEEK_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function weekLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `Semaine du ${WEEK_FMT.format(new Date(y, m - 1, d))}`;
}

export default async function SessionsPage() {
  const supabase = await createClient();

  const [{ data: reviewsData }, { data: accountsData }] = await Promise.all([
    supabase
      .from('journal_reviews')
      .select('id, account_id, week_start, answers, updated_at')
      .order('week_start', { ascending: false })
      .returns<ReviewRow[]>(),
    supabase
      .from('journal_accounts')
      .select('id, label, rules_snapshot')
      .returns<AccountRow[]>(),
  ]);

  const reviews = reviewsData ?? [];
  const accounts = accountsData ?? [];
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <main className="jwrap">
      <div className="jhead">
        <div>
          <h1 className="jh1">Sessions</h1>
          <p className="jsub">Tes revues de semaine, tous comptes réunis — ce qui te fait rouvrir le journal le week-end.</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune revue pour l’instant"
          description="La revue guidée de la semaine (ce qui a marché, ce qui t’a coûté, ta règle pour la suite) s’ouvre depuis une page compte. Elles se retrouveront toutes ici."
          action={
            <Link href="/app/accounts" className={buttonClasses({ variant: 'secondary' })}>
              Ouvrir un compte
            </Link>
          }
        />
      ) : (
        <div className="sess-list">
          {reviews.map((r) => {
            const acc = byId.get(r.account_id);
            const answers = r.answers ?? {};
            const snippet = answers.went_well || answers.what_cost || answers.next_focus || '';
            return (
              <Link
                key={r.id}
                href={`/app/accounts/${r.account_id}/review?week=${r.week_start}`}
                className="sess-row card card-interactive"
              >
                <div className="sess-row-head">
                  <span className="sess-row-week">{weekLabel(r.week_start)}</span>
                  <span className="sess-row-acc">{acc?.label ?? 'Compte'} · {acc?.rules_snapshot?.display?.firmName}</span>
                </div>
                {snippet ? <p className="sess-row-snippet">{snippet}</p> : <p className="sess-row-empty">Revue commencée — à compléter.</p>}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
