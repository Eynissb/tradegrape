-- =====================================================================
-- Tradegrape — schéma initial (complet)
-- Comparateur prop firms futures + journal de trading + communauté
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================

create type market_type      as enum ('futures', 'forex', 'crypto');
create type drawdown_type    as enum ('EOD', 'TRAIL', 'STATIC');
create type account_kind     as enum ('evaluation', 'direct');
create type payout_model     as enum ('fixed_cap', 'pct_profit', 'progressive', 'buffer_then_free', 'unlimited');
create type journal_status   as enum ('evaluation', 'funded', 'passed', 'failed', 'archived');
create type trade_direction  as enum ('long', 'short');
create type trade_source     as enum ('manual', 'csv', 'api');
create type user_role        as enum ('owner', 'admin', 'editor', 'moderator', 'analyst', 'user');
create type moderation_status as enum ('pending', 'verified', 'rejected');
create type content_status   as enum ('draft', 'published', 'archived');
create type locale_code      as enum ('fr', 'en');
create type rule_stance      as enum ('allowed', 'restricted', 'forbidden', 'monitored');
create type session_kind     as enum ('live', 'replay', 'webinar');

-- =====================================================================
-- PROFILS & RÔLES
-- =====================================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  role          user_role not null default 'user',
  locale        locale_code not null default 'fr',
  is_public     boolean not null default false,   -- profil visible sur le leaderboard
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'user'::user_role);
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('owner','admin','editor','moderator','analyst');
$$;

create or replace function can_edit_catalog() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('owner','admin');
$$;

create or replace function can_edit_content() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('owner','admin','editor');
$$;

create or replace function can_moderate() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('owner','admin','moderator');
$$;

-- =====================================================================
-- RÉFÉRENTIELS
-- =====================================================================

-- Plateformes et flux de données (Rithmic, Tradovate, ProjectX, NinjaTrader…)
create table platforms (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  logo_url    text,
  is_datafeed boolean not null default false,  -- flux de données vs plateforme de trading
  website_url text
);

-- Instruments futures (ES, NQ, CL, GC…)
create table instruments (
  id            uuid primary key default uuid_generate_v4(),
  symbol        text unique not null,          -- ES, MES, NQ…
  name          text not null,
  asset_class   text not null,                 -- indices, energy, metals, currencies, agri, bonds
  is_micro      boolean not null default false,
  tick_value    numeric(10,4),
  exchange      text
);

-- =====================================================================
-- CATALOGUE : firms → plans → offers
-- =====================================================================

create table firms (
  id                uuid primary key default uuid_generate_v4(),
  slug              text unique not null,
  name              text not null,
  market_type       market_type not null default 'futures',
  logo_url          text,
  website_url       text,
  support_url       text,
  discord_url       text,

  -- affiliation
  affiliate_url     text,
  default_url       text,
  affiliate_active  boolean not null default false,
  commission_note   text,                       -- interne : conditions négociées

  -- identité
  founded_year      int,
  country           text,
  hq_city           text,

  -- confiance
  trustpilot_rating numeric(3,2),
  trustpilot_count  int,
  trustpilot_url    text,
  health_score      int check (health_score between 0 and 100),
  health_breakdown  jsonb,                      -- {anciennete:20, payouts:25, stabilite_regles:18…}
  health_updated_at timestamptz,

  -- règles globales firm
  max_funded_accounts   int,
  max_eval_accounts     int,
  inactivity_days       int,                    -- suppression du compte après X jours
  restricted_countries  text[] not null default '{}',
  collects_eu_vat       boolean not null default false,

  -- horaires
  daily_flat_time   text,                       -- ex "22:45 Europe/Paris"
  overnight_allowed boolean,
  weekend_allowed   boolean,

  is_active         boolean not null default true,
  is_published      boolean not null default false,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Flux de données proposés par une firm
create table firm_platforms (
  firm_id       uuid not null references firms(id) on delete cascade,
  platform_id   uuid not null references platforms(id) on delete cascade,
  is_free       boolean not null default true,  -- licence offerte
  extra_cost    numeric(10,2),
  note          text,
  primary key (firm_id, platform_id)
);

-- Règles de style de trading, par firm
create table firm_style_rules (
  id              uuid primary key default uuid_generate_v4(),
  firm_id         uuid not null references firms(id) on delete cascade,
  rule_key        text not null,                -- scalping, microscalping, bots, hft, dca, news, bonds
  stance          rule_stance not null,
  threshold_note  text,                         -- ex "signalé si >50% des profits sur trades ≤5s"
  detail          text,
  unique (firm_id, rule_key)
);

-- Commissions par classe d'actif, par firm
create table firm_commissions (
  id            uuid primary key default uuid_generate_v4(),
  firm_id       uuid not null references firms(id) on delete cascade,
  asset_class   text not null,                  -- indices, micro_indices, energy…
  round_turn    numeric(8,2) not null,          -- aller-retour par contrat
  symbols       text[] not null default '{}',
  note          text,
  unique (firm_id, asset_class)
);

create table plans (
  id            uuid primary key default uuid_generate_v4(),
  firm_id       uuid not null references firms(id) on delete cascade,
  slug          text not null,
  name          text not null,
  account_kind  account_kind not null default 'evaluation',
  description   text,
  -- notation éditoriale AU NIVEAU DU PLAN (pas de la firm)
  rating        numeric(3,1),
  rating_note   text,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (firm_id, slug)
);

-- Une offre = plan × taille de compte
create table offers (
  id                    uuid primary key default uuid_generate_v4(),
  plan_id               uuid not null references plans(id) on delete cascade,
  account_size          numeric(12,2) not null,

  -- prix
  price                 numeric(10,2) not null,
  price_regular         numeric(10,2),
  activation_fee        numeric(10,2) not null default 0,
  is_recurring          boolean not null default true,
  currency              text not null default 'USD',
  vat_included          boolean not null default false,

  -- règles d'évaluation
  drawdown_type         drawdown_type not null,
  drawdown_amount       numeric(12,2) not null,
  profit_target         numeric(12,2),
  daily_loss_limit      numeric(12,2),
  consistency_pct       numeric(5,2),
  min_trading_days      int not null default 1,

  -- limites de contrats (évaluation)
  max_minis             int,
  max_micros            int,

  -- règles en funded
  funded_drawdown_type  drawdown_type,
  funded_daily_loss     numeric(12,2),
  funded_consistency_pct numeric(5,2),
  funded_max_minis      int,
  funded_max_micros     int,
  profit_split          numeric(5,2),
  payout_model          payout_model,
  payout_buffer         numeric(12,2),          -- solde minimum à maintenir
  payout_min_amount     numeric(12,2),
  payout_frequency_days int,
  payout_min_days       int,                    -- jours de profit requis par cycle
  payout_daily_threshold numeric(12,2),         -- seuil journalier comptant comme jour de profit
  payout_method         text,                   -- Workmarket, Rise…

  platforms             text[] not null default '{}',
  is_published          boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (plan_id, account_size)
);

-- Plafonds de retrait par cycle (varie souvent entre 1er payout et suivants)
create table offer_payout_caps (
  id            uuid primary key default uuid_generate_v4(),
  offer_id      uuid not null references offers(id) on delete cascade,
  cycle_from    int not null default 1,         -- à partir du payout n°
  cycle_to      int,                            -- null = illimité
  max_amount    numeric(12,2),
  max_pct       numeric(5,2),
  min_profit    numeric(12,2),                  -- objectif minimum du cycle
  note          text
);

-- Scaling plan : contrats débloqués selon les profits
create table offer_scaling_steps (
  id            uuid primary key default uuid_generate_v4(),
  offer_id      uuid not null references offers(id) on delete cascade,
  profit_from   numeric(12,2) not null,
  profit_to     numeric(12,2),
  max_minis     int,
  max_micros    int,
  phase         text not null default 'funded'  -- evaluation | funded
);

-- Historique des règles
create table offer_rule_versions (
  id          uuid primary key default uuid_generate_v4(),
  offer_id    uuid not null references offers(id) on delete cascade,
  snapshot    jsonb not null,
  changed_by  uuid references profiles(id),
  change_note text,
  created_at  timestamptz not null default now()
);

-- Prix TTC réel (angle honnêteté)
create or replace function offer_total_price(o offers) returns numeric
language sql immutable as $$
  select o.price + coalesce(o.activation_fee, 0);
$$;
