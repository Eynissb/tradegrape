-- 0010_journal_setups.sql
-- Playbook (§11, B8) : définition structurée des setups — critères d'entrée,
-- gestion, invalidation. Modèle « coexistence, reliés par le nom » : une
-- définition référence un tag `setup:` prédéfini (`tag_key`), elle ne porte pas
-- de nom libre. La performance réelle par setup se lit via la ventilation
-- « Par setup » des analytics (aucune donnée dupliquée ici).
-- Niveau UTILISATEUR (transverse aux comptes), comme le notebook.

create table journal_setups (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  tag_key       text not null,                 -- "setup:breakout" — lie la définition au tag
  entry         text not null default '',      -- critères d'entrée
  management    text not null default '',      -- gestion en position
  invalidation  text not null default '',      -- ce qui invalide le setup
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Une seule définition par setup et par utilisateur (upsert sur ce couple).
  unique (user_id, tag_key)
);

create index on journal_setups (user_id, tag_key);

alter table journal_setups enable row level security;

-- Strictement privé, comme le reste du journal.
create policy "setups owner" on journal_setups for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
