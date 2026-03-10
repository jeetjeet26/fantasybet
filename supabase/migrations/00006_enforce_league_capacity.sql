-- Enforce league capacity at write time so joins cannot exceed max_members.

create or replace function public.enforce_league_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_allowed integer;
  current_count bigint;
begin
  select l.max_members
  into max_allowed
  from public.leagues l
  where l.id = new.league_id;

  if max_allowed is null then
    return new;
  end if;

  select count(*)
  into current_count
  from public.league_members lm
  where lm.league_id = new.league_id;

  if current_count >= max_allowed then
    raise exception 'League is full';
  end if;

  return new;
end;
$$;

drop trigger if exists before_join_enforce_capacity on public.league_members;
create trigger before_join_enforce_capacity
before insert on public.league_members
for each row
execute function public.enforce_league_capacity();
