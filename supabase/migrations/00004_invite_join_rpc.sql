-- Resolve and join leagues by invite token without exposing all leagues via RLS.

create or replace function public.resolve_league_invite(invite_token text)
returns table (
  league_id uuid,
  league_name text,
  max_members integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    l.id as league_id,
    l.name as league_name,
    l.max_members
  from public.leagues l
  where lower(l.invite_code) = lower(trim(invite_token))
    or lower(coalesce(l.invite_slug, '')) = lower(trim(invite_token))
  limit 1;
$$;

create or replace function public.join_league_by_invite(invite_token text)
returns table (
  league_id uuid,
  error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_league public.leagues%rowtype;
  member_count bigint;
begin
  if current_user_id is null then
    return query select null::uuid, 'Not authenticated'::text;
    return;
  end if;

  select *
  into target_league
  from public.leagues
  where lower(invite_code) = lower(trim(invite_token))
    or lower(coalesce(invite_slug, '')) = lower(trim(invite_token))
  limit 1;

  if target_league.id is null then
    return query select null::uuid, 'League not found'::text;
    return;
  end if;

  if exists (
    select 1
    from public.league_members
    where league_id = target_league.id
      and user_id = current_user_id
  ) then
    return query select target_league.id, 'You''re already in this league'::text;
    return;
  end if;

  if target_league.max_members is not null then
    select count(*)
    into member_count
    from public.league_members
    where league_id = target_league.id;

    if member_count >= target_league.max_members then
      return query select target_league.id, 'League is full'::text;
      return;
    end if;
  end if;

  insert into public.league_members (league_id, user_id)
  values (target_league.id, current_user_id);

  return query select target_league.id, null::text;
exception
  when unique_violation then
    return query select target_league.id, 'You''re already in this league'::text;
end;
$$;

grant execute on function public.resolve_league_invite(text) to anon, authenticated;
grant execute on function public.join_league_by_invite(text) to authenticated;
