alter table weekly_results
add column week_end date;

update weekly_results
set week_end = week_start + 6
where week_end is null;

alter table weekly_results
alter column week_end set not null;

drop index if exists idx_weekly_results_league_week;
create index idx_weekly_results_league_week on weekly_results(league_id, week_start, week_end);
