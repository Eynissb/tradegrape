-- 0015_funded_drawdown_amount.sql
-- Quatrième mécanisme de la famille « les règles durcissent en financé », et le
-- seul qui n'avait aucune place au schéma.
--
-- Relevé sur phidiaspropfirm.com le 2026-07-24, sélecteur officiel
-- « EVALUATION / AFTER YOU PASS » : le 25K Express to Live passe d'un drawdown
-- de 500 $ en évaluation à 800 $ une fois financé. Ce n'est pas le TYPE qui
-- change (déjà couvert par funded_drawdown_type, migration antérieure) mais le
-- MONTANT.
--
-- Sans cette colonne, `computeDrawdownFloor` garde le montant d'évaluation en
-- financé. Sur le cas Phidias cela donne un plancher TROP HAUT et une marge
-- sous-estimée — la même direction d'erreur que les trois autres mécanismes de
-- cette famille (funded_drawdown_type, funded_daily_loss, verrou au breakeven).
--
-- NULL = identique à l'évaluation, donc aucune offre existante ne change de sens.

alter table offers
  add column if not exists funded_drawdown_amount numeric(12,2);

comment on column offers.funded_drawdown_amount is
  'Montant du drawdown en compte financé s''il diffère de l''évaluation (ex : Phidias Express 500 → 800). NULL = identique.';
