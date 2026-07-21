-- 0004_journal_commissions.sql
-- Commission par contrat aller-retour, saisie au niveau du compte.
--
-- Les exports Tradovate/Apex n'ont pas de colonne de frais et le pnl est BRUT.
-- L'utilisateur saisit le total de commissions de son relevé pour la période
-- importée ; on en déduit ce taux, on l'applique aux imports suivants
-- (fees = qty × taux). Modifiable dans les paramètres du compte.
--
-- Le moteur calcule déjà la progression vers l'objectif sur le NET (pnl − fees) :
-- renseigner ce taux corrige la surestimation du P&L et de la progression.

alter table journal_accounts
  add column commission_per_contract numeric(10, 4)
    check (commission_per_contract is null or commission_per_contract >= 0);

comment on column journal_accounts.commission_per_contract is
  'Commission $ par contrat aller-retour appliquée aux imports (fees = qty × taux). Null = non renseignée → avertissement sur le compte.';
