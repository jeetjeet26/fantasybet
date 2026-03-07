-- FantasyLines initial schema
-- Run this migration against your Supabase project

-- =============================================================================
-- ENUMS
-- =============================================================================

create type bet_type as enum ('spread', 'moneyline', 'over_under');
create type bet_pick as enum ('home', 'away', 'over', 'under');
create type bet_result as enum ('pending', 'won', 'lost', 'push');
create type slate_status as enum ('open', 'locked', 'settled');
create type game_status as enum ('upcoming', 'live', 'settled', 'cancelled');
create type invite_status as enum ('pending', 'accepted', 'declined');

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 3. League members
create table league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

-- 4. League invites
create table league_invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references profiles(id) on delete cascade,
  status invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (league_id, invited_email)
);

-- 5. Daily slates (one per league per day)
create table daily_slates (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  date date not null,
  locked_at timestamptz,
  status slate_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (league_id, date)
);

-- 6. Slate games
create table slate_games (
  id uuid primary key default gen_random_uuid(),
  slate_id uuid not null references daily_slates(id) on delete cascade,
  sport_key text not null,
  sport_title text not null,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz not null,
  spread_home numeric(5,1),
  spread_away numeric(5,1),
  spread_home_odds integer,
  spread_away_odds integer,
  moneyline_home integer,
  moneyline_away integer,
  total_over numeric(5,1),
  total_under numeric(5,1),
  total_over_odds integer,
  total_under_odds integer,
  home_score integer,
  away_score integer,
  status game_status not null default 'upcoming'
);

-- 7. Bets
create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slate_game_id uuid not null references slate_games(id) on delete cascade,
  bet_type bet_type not null,
  bet_pick bet_pick not null,
  amount numeric(10,2) not null check (amount > 0),
  odds integer not null,
  potential_payout numeric(10,2) not null,
  result bet_result not null default 'pending',
  payout numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- 8. Daily results
create table daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  league_id uuid not null references leagues(id) on delete cascade,
  date date not null,
  total_wagered numeric(10,2) not null default 0,
  total_won numeric(10,2) not null default 0,
  net_profit numeric(10,2) not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  pushes integer not null default 0,
  placement integer not null default 0,
  points integer not null default 0,
  unique (user_id, league_id, date)
);

-- 9. Weekly results
create table weekly_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  league_id uuid not null references leagues(id) on delete cascade,
  week_start date not null,
  total_points integer not null default 0,
  total_profit numeric(10,2) not null default 0,
  total_wins integer not null default 0,
  total_losses integer not null default 0,
  placement integer not null default 0,
  unique (user_id, league_id, week_start)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_league_members_league on league_members(league_id);
create index idx_league_members_user on league_members(user_id);
create index idx_league_invites_email on league_invites(invited_email);
create index idx_slate_games_slate on slate_games(slate_id);
create index idx_bets_user on bets(user_id);
create index idx_bets_game on bets(slate_game_id);
create index idx_daily_results_league_date on daily_results(league_id, date);
create index idx_weekly_results_league_week on weekly_results(league_id, week_start);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table league_invites enable row level security;
alter table daily_slates enable row level security;
alter table slate_games enable row level security;
alter table bets enable row level security;
alter table daily_results enable row level security;
alter table weekly_results enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Leagues: members can read their leagues, anyone can create
create policy "League members can view league" on leagues
  for select using (
    id in (select league_id from league_members where user_id = auth.uid())
  );
create policy "Authenticated users can create leagues" on leagues
  for insert with check (auth.uid() = created_by);

-- League members: members can see co-members, users can join
create policy "Members can view co-members" on league_members
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );
create policy "Users can join leagues" on league_members
  for insert with check (auth.uid() = user_id);
create policy "Users can leave leagues" on league_members
  for delete using (auth.uid() = user_id);

-- League invites: league members can see invites, members can invite
create policy "Members can view league invites" on league_invites
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );
create policy "Members can create invites" on league_invites
  for insert with check (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );
create policy "Invited users can update invite status" on league_invites
  for update using (
    invited_email in (select email from auth.users where id = auth.uid())
  );

-- Daily slates: everyone can read
create policy "League members can view slates" on daily_slates
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- Slate games: everyone can read
create policy "Slate games are viewable by authenticated users" on slate_games
  for select using (auth.uid() is not null);

-- Bets: users can see own bets, users can place bets
create policy "Users can view own bets" on bets
  for select using (auth.uid() = user_id);
create policy "Users can place bets" on bets
  for insert with check (auth.uid() = user_id);

-- Daily results: league members can view
create policy "League members can view daily results" on daily_results
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- Weekly results: league members can view
create policy "League members can view weekly results" on weekly_results
  for select using (
    league_id in (select league_id from league_members where user_id = auth.uid())
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-add league creator as member
create or replace function handle_league_created()
returns trigger as $$
begin
  insert into league_members (league_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_league_created
  after insert on leagues
  for each row execute function handle_league_created();

-- Calculate payout from American odds
create or replace function calc_payout(wager numeric, american_odds integer)
returns numeric as $$
begin
  if american_odds > 0 then
    return round(wager + (wager * american_odds / 100.0), 2);
  else
    return round(wager + (wager * 100.0 / abs(american_odds)), 2);
  end if;
end;
$$ language plpgsql immutable;

-- Placement points mapping
create or replace function placement_points(place integer)
returns integer as $$
begin
  return case place
    when 1 then 10
    when 2 then 8
    when 3 then 6
    when 4 then 5
    when 5 then 4
    when 6 then 3
    when 7 then 2
    else 1
  end;
end;
$$ language plpgsql immutable;
