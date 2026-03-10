-- Allow service-role edge functions to read the Odds API key from Vault via RPC.

create or replace function public.get_the_odds_api_key()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'the_odds_api_key'
  limit 1;
$$;

revoke all on function public.get_the_odds_api_key() from public;
grant execute on function public.get_the_odds_api_key() to service_role;
