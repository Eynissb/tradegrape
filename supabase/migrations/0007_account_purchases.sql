-- 0007_account_purchases.sql
-- Ce que le trader a réellement DÉPENSÉ par compte (challenges, resets, activations).
-- Croisé avec journal_payouts (déjà là), alimente le bilan financier prop firm :
-- « est-ce que je gagne réellement de l'argent avec ça ? » — que personne ne calcule.
-- Cette donnée agrégée/anonymisée dira quelles firms font vraiment gagner les traders.

create table account_purchases (
  id                  uuid primary key default uuid_generate_v4(),
  journal_account_id  uuid not null references journal_accounts(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  kind                text not null,                       -- challenge | reset | activation
  amount              numeric(12,2) not null,
  currency            text not null default 'USD',
  purchased_at        date not null default current_date,
  created_at          timestamptz not null default now()
);

create index on account_purchases (journal_account_id);

alter table account_purchases enable row level security;

-- Strictement privé, comme le reste du journal.
create policy "purchases owner" on account_purchases for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
