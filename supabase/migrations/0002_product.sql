-- =====================================================================
-- Tradawave — schéma partie 2
-- Journal, communauté, contenu, promos, créateur, système, RLS
-- =====================================================================

-- =====================================================================
-- JOURNAL DE TRADING
-- =====================================================================

create table journal_accounts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  offer_id          uuid references offers(id) on delete set null,
  -- snapshot des règles au moment de l'ajout : l'offre peut changer ensuite
  rules_snapshot    jsonb not null,
  label             text,
  account_size      numeric(12,2) not null,
  starting_balance  numeric(12,2) not null,
  status            journal_status not null default 'evaluation',
  phase             text not null default 'evaluation',
  started_at        date not null default current_date,
  ended_at          date,
  -- alerte si les règles de l'offre ont changé depuis le snapshot
  rules_changed_at  timestamptz,
  rules_ack_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table trades (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references journal_accounts(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  symbol        text not null,
  direction     trade_direction,
  quantity      numeric(12,4),
  entry_price   numeric(16,6),
  exit_price    numeric(16,6),
  pnl           numeric(14,2) not null,
  fees          numeric(12,2) not null default 0,
  opened_at     timestamptz,
  closed_at     timestamptz not null,
  trade_date    date not null,
  duration_sec  int,
  notes         text,
  tags          text[] not null default '{}',
  screenshot_url text,
  source        trade_source not null default 'manual',
  import_batch  uuid,
  created_at    timestamptz not null default now()
);

-- Historique des payouts déclarés par l'utilisateur (alimente les stats)
create table journal_payouts (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references journal_accounts(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  amount        numeric(12,2) not null,
  requested_at  date,
  received_at   date,
  days_to_pay   int,
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- COMMUNAUTÉ & CONFIANCE
-- =====================================================================

create table reviews (
  id            uuid primary key default uuid_generate_v4(),
  firm_id       uuid not null references firms(id) on delete cascade,
  user_id       uuid references profiles(id) on delete set null,
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text,
  is_verified_trader boolean not null default false,  -- a un compte journal chez cette firm
  status        moderation_status not null default 'pending',
  moderated_by  uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table payout_proofs (
  id            uuid primary key default uuid_generate_v4(),
  firm_id       uuid not null references firms(id) on delete cascade,
  user_id       uuid references profiles(id) on delete set null,
  amount        numeric(12,2),
  currency      text default 'USD',
  requested_at  date,
  paid_at       date,
  days_to_pay   int,
  method        text,
  evidence_url  text,
  status        moderation_status not null default 'pending',
  verified_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid references profiles(id) on delete set null,
  target_table  text not null,
  target_id     uuid not null,
  reason        text not null,
  status        moderation_status not null default 'pending',
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- CONTENU BILINGUE
-- =====================================================================

create table posts (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null,
  locale        locale_code not null,
  title         text not null,
  excerpt       text,
  body_md       text,
  cover_url     text,
  meta_title    text,
  meta_desc     text,
  og_image_url  text,
  reading_min   int,
  tags          text[] not null default '{}',
  status        content_status not null default 'draft',
  author_id     uuid references profiles(id),
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (slug, locale)
);

-- Guides par firm, en base, bilingues, par sections ancrables
create table firm_guides (
  id            uuid primary key default uuid_generate_v4(),
  firm_id       uuid not null references firms(id) on delete cascade,
  locale        locale_code not null,
  intro_md      text,
  verdict_md    text,
  pros          text[] not null default '{}',
  cons          text[] not null default '{}',
  target_audience text[] not null default '{}',
  meta_title    text,
  meta_desc     text,
  og_image_url  text,
  reading_min   int,
  status        content_status not null default 'draft',
  author_id     uuid references profiles(id),
  reviewed_at   date,
  updated_at    timestamptz not null default now(),
  unique (firm_id, locale)
);

-- Sections d'un guide (drawdown, cohérence, plateformes, payout…)
-- Permet le sommaire à ancres + l'insertion de modules interactifs.
create table guide_sections (
  id            uuid primary key default uuid_generate_v4(),
  guide_id      uuid not null references firm_guides(id) on delete cascade,
  anchor        text not null,                  -- regles-drawdown, funded-pro…
  group_label   text,                           -- "Règles de trading", "Compte financé"
  title         text not null,
  body_md       text,
  -- module interactif greffé à cette section (notre différenciateur)
  widget_key    text,                           -- rule_simulator, payout_calculator,
                                                -- commission_calculator, scaling_simulator,
                                                -- consistency_visualizer
  widget_config jsonb,
  sort_order    int not null default 0,
  unique (guide_id, anchor)
);

-- FAQ réutilisable (guides, pages, JSON-LD FAQPage)
create table faqs (
  id            uuid primary key default uuid_generate_v4(),
  scope_table   text not null,                  -- firms, offers, pages
  scope_id      uuid,
  locale        locale_code not null,
  question      text not null,
  answer_md     text not null,
  sort_order    int not null default 0
);

-- =====================================================================
-- PROMOS
-- =====================================================================

create table promo_codes (
  id              uuid primary key default uuid_generate_v4(),
  firm_id         uuid not null references firms(id) on delete cascade,
  code            text not null,
  is_exclusive    boolean not null default false,  -- code négocié par nous
  discount_pct    numeric(5,2),
  discount_note   text,                            -- "-40% Pro/Flex, -30% Direct"
  applies_to_plans uuid[] not null default '{}',
  excludes_resets boolean not null default true,
  bonus_note      text,                            -- "+1 éval gratuite"
  starts_at       timestamptz,
  ends_at         timestamptz,
  last_tested_at  date,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- =====================================================================
-- PRÉSENCE CRÉATEUR
-- =====================================================================

create table sessions (
  id            uuid primary key default uuid_generate_v4(),
  locale        locale_code not null default 'fr',
  kind          session_kind not null default 'live',
  title         text not null,
  description   text,
  stream_url    text,
  replay_url    text,
  thumbnail_url text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_live       boolean not null default false,
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now()
);

create table news_items (
  id            uuid primary key default uuid_generate_v4(),
  locale        locale_code not null default 'fr',
  firm_id       uuid references firms(id) on delete set null,
  title         text not null,
  body_md       text,
  source_url    text,
  is_pinned     boolean not null default false,
  status        content_status not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table social_links (
  id          uuid primary key default uuid_generate_v4(),
  platform    text not null,                    -- youtube, discord, kick, x, instagram, tiktok
  url         text not null,
  label       text,
  follower_count int,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

-- =====================================================================
-- TRACKING & SYSTÈME
-- =====================================================================

create table affiliate_clicks (
  id          uuid primary key default uuid_generate_v4(),
  firm_id     uuid references firms(id) on delete set null,
  offer_id    uuid references offers(id) on delete set null,
  promo_id    uuid references promo_codes(id) on delete set null,
  user_id     uuid references profiles(id) on delete set null,
  session_id  text,
  source_page text,
  locale      locale_code,
  created_at  timestamptz not null default now()
);

create table feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  updated_at  timestamptz not null default now()
);

create table audit_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references profiles(id),
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create table email_subscribers (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  locale      locale_code not null default 'fr',
  source      text,
  user_id     uuid references profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,                    -- rules_changed, payout_ready, promo_ending
  title       text not null,
  body        text,
  link_url    text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- INDEX
-- =====================================================================

create index idx_firms_published    on firms(is_published, is_active);
create index idx_plans_firm         on plans(firm_id);
create index idx_offers_plan        on offers(plan_id);
create index idx_offers_published   on offers(is_published);
create index idx_offers_filters     on offers(drawdown_type, account_size, price);
create index idx_journal_user       on journal_accounts(user_id);
create index idx_trades_account     on trades(account_id, trade_date);
create index idx_trades_user        on trades(user_id);
create index idx_clicks_firm        on affiliate_clicks(firm_id, created_at);
create index idx_reviews_firm       on reviews(firm_id, status);
create index idx_proofs_firm        on payout_proofs(firm_id, status);
create index idx_posts_pub          on posts(locale, status, published_at desc);
create index idx_guides_firm        on firm_guides(firm_id, locale);
create index idx_sections_guide     on guide_sections(guide_id, sort_order);
create index idx_promos_firm        on promo_codes(firm_id, is_active);
create index idx_notif_user         on notifications(user_id, read_at);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_firms_touch    before update on firms            for each row execute function touch_updated_at();
create trigger t_plans_touch    before update on plans            for each row execute function touch_updated_at();
create trigger t_offers_touch   before update on offers           for each row execute function touch_updated_at();
create trigger t_journal_touch  before update on journal_accounts for each row execute function touch_updated_at();
create trigger t_posts_touch    before update on posts            for each row execute function touch_updated_at();
create trigger t_guides_touch   before update on firm_guides      for each row execute function touch_updated_at();
create trigger t_profiles_touch before update on profiles         for each row execute function touch_updated_at();

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- Versioning des règles + notification des journaux concernés
create or replace function snapshot_offer_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    insert into offer_rule_versions (offer_id, snapshot, changed_by)
    values (new.id, to_jsonb(old), auth.uid());

    update journal_accounts
       set rules_changed_at = now()
     where offer_id = new.id and status in ('evaluation','funded');

    insert into notifications (user_id, kind, title, body, link_url)
    select ja.user_id, 'rules_changed',
           'Les règles de ton compte ont changé',
           'La prop firm a modifié les conditions de cette offre. Vérifie l’impact sur ton challenge.',
           '/app/accounts/' || ja.id
      from journal_accounts ja
     where ja.offer_id = new.id and ja.status in ('evaluation','funded');
  end if;
  return new;
end $$;

create trigger t_offers_version
  after update on offers for each row execute function snapshot_offer_rules();

create or replace function write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, action, table_name, record_id, before, after)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(new.id, old.id),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger t_audit_firms   after insert or update or delete on firms       for each row execute function write_audit();
create trigger t_audit_plans   after insert or update or delete on plans       for each row execute function write_audit();
create trigger t_audit_offers  after insert or update or delete on offers      for each row execute function write_audit();
create trigger t_audit_promos  after insert or update or delete on promo_codes for each row execute function write_audit();

-- =====================================================================
-- RLS
-- =====================================================================

alter table profiles            enable row level security;
alter table platforms           enable row level security;
alter table instruments         enable row level security;
alter table firms               enable row level security;
alter table firm_platforms      enable row level security;
alter table firm_style_rules    enable row level security;
alter table firm_commissions    enable row level security;
alter table plans               enable row level security;
alter table offers              enable row level security;
alter table offer_payout_caps   enable row level security;
alter table offer_scaling_steps enable row level security;
alter table offer_rule_versions enable row level security;
alter table promo_codes         enable row level security;
alter table journal_accounts    enable row level security;
alter table trades              enable row level security;
alter table journal_payouts     enable row level security;
alter table reviews             enable row level security;
alter table payout_proofs       enable row level security;
alter table reports             enable row level security;
alter table posts               enable row level security;
alter table firm_guides         enable row level security;
alter table guide_sections      enable row level security;
alter table faqs                enable row level security;
alter table sessions            enable row level security;
alter table news_items          enable row level security;
alter table social_links        enable row level security;
alter table affiliate_clicks    enable row level security;
alter table feature_flags       enable row level security;
alter table audit_log           enable row level security;
alter table email_subscribers   enable row level security;
alter table notifications       enable row level security;

-- profils
create policy "profil lecture" on profiles for select
  using (id = auth.uid() or is_public or is_staff());
create policy "profil update soi" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = auth_role());
create policy "profil owner gère rôles" on profiles for all
  using (auth_role() = 'owner') with check (auth_role() = 'owner');

-- référentiels : lecture publique
create policy "platforms public" on platforms for select using (true);
create policy "platforms admin"  on platforms for all using (can_edit_catalog()) with check (can_edit_catalog());
create policy "instruments public" on instruments for select using (true);
create policy "instruments admin"  on instruments for all using (can_edit_catalog()) with check (can_edit_catalog());

-- catalogue
create policy "firms public" on firms for select using (is_published or is_staff());
create policy "firms admin"  on firms for all using (can_edit_catalog()) with check (can_edit_catalog());

create policy "firm_platforms public" on firm_platforms for select using (true);
create policy "firm_platforms admin"  on firm_platforms for all using (can_edit_catalog()) with check (can_edit_catalog());
create policy "style_rules public" on firm_style_rules for select using (true);
create policy "style_rules admin"  on firm_style_rules for all using (can_edit_catalog()) with check (can_edit_catalog());
create policy "commissions public" on firm_commissions for select using (true);
create policy "commissions admin"  on firm_commissions for all using (can_edit_catalog()) with check (can_edit_catalog());

create policy "plans public" on plans for select using (is_published or is_staff());
create policy "plans admin"  on plans for all using (can_edit_catalog()) with check (can_edit_catalog());

create policy "offers public" on offers for select using (is_published or is_staff());
create policy "offers admin"  on offers for all using (can_edit_catalog()) with check (can_edit_catalog());

create policy "caps public" on offer_payout_caps for select using (true);
create policy "caps admin"  on offer_payout_caps for all using (can_edit_catalog()) with check (can_edit_catalog());
create policy "scaling public" on offer_scaling_steps for select using (true);
create policy "scaling admin"  on offer_scaling_steps for all using (can_edit_catalog()) with check (can_edit_catalog());
create policy "versions staff" on offer_rule_versions for select using (is_staff());

create policy "promos public" on promo_codes for select using (is_active or is_staff());
create policy "promos admin"  on promo_codes for all using (can_edit_catalog()) with check (can_edit_catalog());

-- journal : strictement privé
create policy "journal owner" on journal_accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trades owner" on trades for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "payouts owner" on journal_payouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- communauté
create policy "reviews lecture" on reviews for select
  using (status = 'verified' or user_id = auth.uid() or can_moderate());
create policy "reviews create" on reviews for insert with check (user_id = auth.uid());
create policy "reviews modif soi" on reviews for update
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid());
create policy "reviews moderation" on reviews for all
  using (can_moderate()) with check (can_moderate());

create policy "proofs lecture" on payout_proofs for select
  using (status = 'verified' or user_id = auth.uid() or can_moderate());
create policy "proofs create" on payout_proofs for insert with check (user_id = auth.uid());
create policy "proofs moderation" on payout_proofs for all
  using (can_moderate()) with check (can_moderate());

create policy "reports create" on reports for insert with check (reporter_id = auth.uid());
create policy "reports moderation" on reports for all
  using (can_moderate()) with check (can_moderate());

-- contenu
create policy "posts lecture" on posts for select
  using (status = 'published' or can_edit_content());
create policy "posts edition" on posts for all
  using (can_edit_content()) with check (can_edit_content());

create policy "guides lecture" on firm_guides for select
  using (status = 'published' or can_edit_content());
create policy "guides edition" on firm_guides for all
  using (can_edit_content()) with check (can_edit_content());

create policy "sections lecture" on guide_sections for select using (true);
create policy "sections edition" on guide_sections for all
  using (can_edit_content()) with check (can_edit_content());

create policy "faqs lecture" on faqs for select using (true);
create policy "faqs edition" on faqs for all
  using (can_edit_content()) with check (can_edit_content());

-- créateur
create policy "sessions lecture" on sessions for select
  using (status = 'published' or can_edit_content());
create policy "sessions edition" on sessions for all
  using (can_edit_content()) with check (can_edit_content());
create policy "news lecture" on news_items for select
  using (status = 'published' or can_edit_content());
create policy "news edition" on news_items for all
  using (can_edit_content()) with check (can_edit_content());
create policy "social lecture" on social_links for select using (is_active);
create policy "social edition" on social_links for all
  using (can_edit_content()) with check (can_edit_content());

-- tracking & système
create policy "clics insert public" on affiliate_clicks for insert with check (true);
create policy "clics lecture staff" on affiliate_clicks for select using (is_staff());
create policy "flags lecture" on feature_flags for select using (true);
create policy "flags admin" on feature_flags for all
  using (can_edit_catalog()) with check (can_edit_catalog());
create policy "audit staff" on audit_log for select using (is_staff());
create policy "emails insert public" on email_subscribers for insert with check (true);
create policy "emails staff" on email_subscribers for select using (is_staff());
create policy "notifs owner" on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
