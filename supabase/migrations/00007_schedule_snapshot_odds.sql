-- Keep daily slates populated in production via Supabase cron.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('snapshot-odds-hourly')
where exists (
  select 1
  from cron.job
  where jobname = 'snapshot-odds-hourly'
);

select cron.schedule(
  'snapshot-odds-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://iqhvtjoknnyflrqxifud.supabase.co/functions/v1/snapshot-odds',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
