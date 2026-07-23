-- 0014_price_nullable.sql
-- « Prix inconnu » et « gratuit » sont deux états différents.
--
-- La collecte des 13 firms (juillet 2026) fournit les règles mais pas les prix :
-- beaucoup de firms ne les publient qu'en tunnel d'achat, et plusieurs sources
-- se contredisent (Topstep 150k : 149 ou 199 selon la source). Insérer 0 ferait
-- afficher « gratuit » sur une centaine d'offres — exactement le type de donnée
-- fausse que le positionnement honnêteté condamne (§1, §8).
--
-- `price` devient donc nullable : NULL = prix non établi, à afficher comme tel
-- et à compléter avant publication. Le prix total (`offer_total_price`) doit
-- traiter ce cas : sans prix, pas de total.

alter table offers alter column price drop not null;

comment on column offers.price is
  'Prix affiché. NULL = prix non encore établi/vérifié (distinct de 0 = gratuit).';

-- Sans prix connu, le total n'a pas de sens : on renvoie NULL plutôt que
-- l'addition partielle des frais d'activation, qui se lirait comme un prix.
create or replace function offer_total_price(o offers) returns numeric
language sql immutable as $$
  select case
    when o.price is null then null
    else o.price + coalesce(o.activation_fee, 0)
  end;
$$;
