-- 0005_import_platform.sql
-- Étiquette la plateforme source d'un lot d'import, pour lister et supprimer les
-- lots (trades.import_batch existe déjà mais rien ne le renseignait).
-- Les trades importés avant cette migration ont import_batch/import_platform null
-- et ne sont pas groupés en lot ; ils restent supprimables par sélection multiple.

alter table trades
  add column import_platform text;

comment on column trades.import_platform is
  'Plateforme source du lot d''import (tradovate/ninjatrader/rithmic). Null pour la saisie manuelle.';
