alter table slate_games
add column odds_api_event_id text;

create index slate_games_odds_api_event_id_idx
on slate_games (odds_api_event_id);
