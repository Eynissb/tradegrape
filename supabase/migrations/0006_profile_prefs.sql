-- 0006_profile_prefs.sql
-- Préférences personnelles (niveau utilisateur, pas niveau compte de trading) :
-- affichage et notifications. display_name / email / locale existent déjà.

alter table profiles
  add column currency           text    not null default 'USD',
  add column date_format        text    not null default 'DD/MM/YYYY',
  add column timezone           text    not null default 'Europe/Paris',
  add column notif_rule_changes boolean not null default true,
  add column notif_weekly       boolean not null default true;

comment on column profiles.currency is 'Devise d''affichage par défaut de l''utilisateur (fallback ; une offre garde la sienne).';
comment on column profiles.notif_rule_changes is 'Recevoir les alertes de changement de règles.';
comment on column profiles.notif_weekly is 'Recevoir le résumé hebdomadaire.';
