-- 0009_journal_notes.sql
-- Notebook (§11) : notes libres NON rattachées à un trade — plan de trading,
-- observations de marché, règles perso. Ce qui fait ouvrir l'outil les jours
-- sans trade. Niveau UTILISATEUR (transverse aux comptes), pas par compte.

create table journal_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  pinned      boolean not null default false,   -- épingler le plan de trading en haut
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on journal_notes (user_id, pinned desc, updated_at desc);

alter table journal_notes enable row level security;

-- Strictement privé, comme le reste du journal.
create policy "notes owner" on journal_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
