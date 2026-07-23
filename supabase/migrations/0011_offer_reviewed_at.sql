-- 0011_offer_reviewed_at.sql
-- §8 : chaque donnée de règle affichée doit être vérifiée à la source et datée.
-- `updated_at` est automatique (toute écriture le bouge) ; il ne dit pas quand
-- un humain a re-vérifié les règles à la source. On ajoute une date de
-- vérification explicite, éditée à la main, affichable en public (angle honnêteté).

alter table offers add column if not exists reviewed_at date;

comment on column offers.reviewed_at is
  'Date de dernière vérification des règles à la source (saisie manuelle admin).';
