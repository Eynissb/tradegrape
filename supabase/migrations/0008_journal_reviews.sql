-- 0008_journal_reviews.sql
-- Revue hebdomadaire guidée (§11) : ce qui fait rouvrir l'outil le week-end.
-- Les STATS de la semaine sont recalculées à la volée par le moteur ; cette
-- table ne stocke que les RÉPONSES libres du trader à la synthèse. Alimentera
-- le digest-emails (§10).
-- Une revue par (compte × semaine). La semaine est identifiée par son lundi.

create table journal_reviews (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  account_id    uuid not null references journal_accounts(id) on delete cascade,
  week_start    date not null,                    -- lundi de la semaine
  answers       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (account_id, week_start)
);

create index on journal_reviews (account_id, week_start);

alter table journal_reviews enable row level security;

-- Strictement privé, comme le reste du journal.
create policy "reviews owner" on journal_reviews for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
