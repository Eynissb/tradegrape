-- =====================================================================
-- Tradawave — firms demandées (comptes personnalisés du journal)
-- Quand un trader crée un compte pour une firm non listée, on enregistre
-- le nom : ça pilote les priorités d'ajout au comparateur.
-- =====================================================================

create table requested_firms (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null,             -- saisi tel quel (affichage)
  normalized         text not null unique,      -- lower(trim(name)) pour dédup
  request_count      int  not null default 1,
  first_requested_at timestamptz not null default now(),
  last_requested_at  timestamptz not null default now()
);

alter table requested_firms enable row level security;

-- Lecture réservée au staff : piloter les priorités depuis l'admin.
create policy "requested_firms staff read" on requested_firms
  for select using (is_staff());

-- Enregistrement dédupliqué + compteur, appelable par tout utilisateur connecté.
-- security definer : contourne RLS pour l'écriture, dédup atomique par normalized.
create or replace function record_firm_request(firm_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  norm text := lower(trim(firm_name));
begin
  if norm = '' then
    return;
  end if;
  insert into requested_firms (name, normalized)
  values (trim(firm_name), norm)
  on conflict (normalized) do update
    set request_count     = requested_firms.request_count + 1,
        last_requested_at = now();
end;
$$;

grant execute on function record_firm_request(text) to authenticated;
