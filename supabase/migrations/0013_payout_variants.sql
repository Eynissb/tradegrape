-- 0013_payout_variants.sql
-- Trois mécanismes relevés sur les 13 firms sont tous des PROGRESSIONS PAR
-- NUMÉRO DE PAYOUT. `offer_payout_caps` est déjà indexée par cycle
-- (cycle_from / cycle_to) : c'est le bon endroit, plutôt que trois tables.
--
--  §12 #5 — deux chemins de payout pour une même offre
--           Topstep : Standard (5 jours à 150 $, plafonds 2000/3000/5000)
--           OU Consistency (3 jours, cohérence 40 %, plafonds 3000/4000/6000).
--           Tradeify Select : Flex ou Daily, choix définitif.
--           → `variant` : les lignes d'un même chemin partagent la même clé.
--           Impossible à modéliser par duplication d'offre : `offers` porte
--           `unique (plan_id, account_size)`.
--
--  §12 #3 — split par palier
--           TradeDay 50/50 sous 4 000 $ puis 80/20 ; Bulenox et Tradeify 100 %
--           sur les premiers 10-15 k puis 90/10 ; Phidias 75 % → 100 % sur les
--           cinq premiers payouts.  → `split_pct`
--
--  §12 #4 — cohérence progressive
--           Tradeify Lightning : 20 % au 1er payout, 25 % au 2e, 30 % ensuite.
--           → `consistency_pct`
--
-- Le compte fige la variante choisie dans son `rules_snapshot` à l'ajout.
-- Tout est nullable : les offres existantes gardent exactement leur sens, et une
-- offre à chemin unique laisse simplement `variant` à NULL.

alter table offer_payout_caps
  add column if not exists variant          text,
  add column if not exists split_pct        numeric(5,2),
  add column if not exists consistency_pct  numeric(5,2),
  add column if not exists min_profit_days  int,
  add column if not exists daily_threshold  numeric(12,2);

comment on column offer_payout_caps.variant is
  'Chemin de payout (ex : standard | consistency | flex | daily). NULL = chemin unique.';
comment on column offer_payout_caps.split_pct is
  'Profit split applicable à CE palier (§12 #3, splits progressifs).';
comment on column offer_payout_caps.consistency_pct is
  'Cohérence applicable à CE palier (§12 #4, cohérence progressive).';
comment on column offer_payout_caps.min_profit_days is
  'Jours de profit requis pour CETTE variante (diffère entre chemins Topstep).';
comment on column offer_payout_caps.daily_threshold is
  'Seuil qu''un jour doit atteindre pour compter, pour CETTE variante.';

-- Un cycle est unique PAR VARIANTE : deux chemins peuvent tous deux définir
-- « payouts 1-2 ». L'index nommé permet un upsert propre côté admin.
create unique index if not exists offer_payout_caps_variant_cycle_idx
  on offer_payout_caps (offer_id, coalesce(variant, ''), cycle_from);
