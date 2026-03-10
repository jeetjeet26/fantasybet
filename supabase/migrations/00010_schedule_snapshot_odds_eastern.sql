-- Replace the hourly slate refresh with a 6:00 AM Eastern release window.
-- We schedule both 10:00 UTC and 11:00 UTC daily so daylight saving time is covered.
-- The Edge Function itself checks Eastern time and only publishes once the local hour is >= 6.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('snapshot-odds-hourly')
where exists (
  select 1
  from cron.job
  where jobname = 'snapshot-odds-hourly'
);

select cron.unschedule('snapshot-odds-6am-et-edt')
where exists (
  select 1
  from cron.job
  where jobname = 'snapshot-odds-6am-et-edt'
);

select cron.unschedule('snapshot-odds-6am-et-est')
where exists (
  select 1
  from cron.job
  where jobname = 'snapshot-odds-6am-et-est'
);

select cron.schedule(
  'snapshot-odds-6am-et-edt',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://iqhvtjoknnyflrqxifud.supabase.co/functions/v1/snapshot-odds',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);

select cron.schedule(
  'snapshot-odds-6am-et-est',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://iqhvtjoknnyflrqxifud.supabase.co/functions/v1/snapshot-odds',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);

