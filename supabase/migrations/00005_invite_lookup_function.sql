-- Allow invite-based league resolution without broadening league SELECT RLS.
-- Used by join flows for invite link (/join/[slug]) and invite code.
create or replace function public.find_league_by_invite(input_token text)
returns table (
  id uuid,
  name text,
  max_members integer
)
language sql
security definer
set search_path = public
as $$
  select l.id, l.name, l.max_members
  from public.leagues l
  where
    lower(l.invite_code) = lower(trim(input_token))
    or (
      l.invite_slug is not null
      and lower(l.invite_slug) = lower(trim(input_token))
    )
  limit 1;
$$;

grant execute on function public.find_league_by_invite(text) to anon, authenticated;
