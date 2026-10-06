-- 0016_newsletter_subscribers.sql
-- Capture email publique (home) : alertes de changement de règles, codes promo
-- exclusifs négociés, digest hebdo (§1 « email capté », §7 promos, §10 digest-emails).
--
-- Sécurité : insert-only côté public via une RPC SECURITY DEFINER — AUCUNE lecture
-- publique (pas d'énumération des inscrits), aucun insert direct. Même esprit que
-- record_firm_request() (§11). Le double opt-in viendra plus tard (confirmed_at).

create table newsletter_subscribers (
  id              uuid primary key default uuid_generate_v4(),
  email           text not null,                 -- tel que saisi (trim)
  email_norm      text not null,                 -- lower(trim) : clé de dédup
  locale          text not null default 'fr',
  source          text not null default 'home',
  confirmed_at    timestamptz,                   -- double opt-in : rempli plus tard
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (email_norm)
);

alter table newsletter_subscribers enable row level security;
-- Aucune policy volontairement : la table est inaccessible via la clé anon
-- (ni select, ni insert direct). Seule la fonction SECURITY DEFINER ci-dessous
-- (qui s'exécute avec les droits de son propriétaire) peut y écrire.

-- Enregistre une inscription (upsert idempotent). Ne révèle jamais si l'email
-- existait déjà → pas d'énumération. Valide un format email minimal en base.
-- Une réinscription réactive un email précédemment désinscrit.
create or replace function record_email_signup(
  p_email  text,
  p_locale text default 'fr',
  p_source text default 'home'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := lower(trim(p_email));
begin
  if v_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  insert into newsletter_subscribers (email, email_norm, locale, source)
  values (
    trim(p_email),
    v_norm,
    case when p_locale in ('fr', 'en') then p_locale else 'fr' end,
    coalesce(nullif(p_source, ''), 'home')
  )
  on conflict (email_norm) do update
    set unsubscribed_at = null,
        locale = excluded.locale;
end;
$$;

-- Seul point d'entrée public : exécutable par les rôles anon/authenticated.
grant execute on function record_email_signup(text, text, text) to anon, authenticated;
