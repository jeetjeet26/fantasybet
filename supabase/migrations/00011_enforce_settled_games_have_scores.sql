alter table slate_games
add constraint settled_games_require_scores
check (
  status <> 'settled'
  or (home_score is not null and away_score is not null)
);
