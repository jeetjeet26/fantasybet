-- Platform Parity: Commissioner roles, invite slug, league settings
-- Run after 00001_initial_schema.sql

-- Role for league members
create type league_member_role as enum ('commissioner', 'member');

-- League members: add role (creator = commissioner)
alter table league_members add column if not exists role league_member_role not null default 'member';

-- Backfill: set role to commissioner where user_id = league.created_by
update league_members lm
set role = 'commissioner'
from leagues l
where lm.league_id = l.id and lm.user_id = l.created_by;

-- Leagues: invite slug for shareable link /join/[slug]
alter table leagues add column if not exists invite_slug text unique;

-- Backfill invite_slug from invite_code so existing leagues have a link
update leagues set invite_slug = invite_code where invite_slug is null;

-- Default for new leagues: set invite_slug = invite_code in trigger (see below)

-- Phase 2: League settings
alter table leagues add column if not exists max_members integer;
alter table leagues add column if not exists description text;
alter table leagues add column if not exists logo_url text;

create type invite_mode as enum ('any_member', 'commissioner_only');
alter table leagues add column if not exists invite_mode invite_mode not null default 'any_member';

-- Ensure new league creator gets commissioner role (adjust trigger)
create or replace function handle_league_created()
returns trigger as $$
begin
  insert into public.league_members (league_id, user_id, role)
  values (new.id, new.created_by, 'commissioner');
  -- Set invite_slug if not set (for new leagues, invite_code is already set)
  update public.leagues set invite_slug = invite_code where id = new.id and invite_slug is null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- RLS: only commissioner can update league settings (and delete league later)
-- (We'll enforce in app + optional RLS policy; existing policies stay for now.)

-- Index for join-by-slug lookup
create index if not exists idx_leagues_invite_slug on leagues(invite_slug) where invite_slug is not null;
