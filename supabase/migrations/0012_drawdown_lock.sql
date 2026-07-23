-- 0012_drawdown_lock.sql
-- §12 #2 : le verrouillage du trailing au capital initial (« lock at breakeven »)
-- n'est PAS universel. Apex verrouille sur Rithmic et WealthCharts mais ne
-- verrouille JAMAIS sur Tradovate. Le moteur le supposait acquis
-- (`Math.min(rawFloor, startingBalance)` en dur) : sans verrou, le vrai plancher
-- continue de monter au-dessus du capital, donc plus HAUT que ce qu'on affichait.
-- On sous-estimait le risque.
--
-- Valeur par défaut `true` = comportement le plus courant, et identique à ce que
-- le moteur faisait jusqu'ici : aucune offre existante ne change de sens.
-- La variation par (offre × plateforme) reste un raffinement ultérieur.

alter table offers
  add column if not exists drawdown_locks_at_breakeven boolean not null default true;

comment on column offers.drawdown_locks_at_breakeven is
  'Le plancher de drawdown se fige-t-il au capital initial ? false = il continue de suivre le plus haut (ex : Apex sur Tradovate).';
