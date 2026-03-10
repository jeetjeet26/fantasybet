-- Settle completed games automatically in production via Supabase cron.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.unschedule('settle-bets-every-10-minutes')
where exists (
  select 1
  from cron.job
  where jobname = 'settle-bets-every-10-minutes'
);

select cron.schedule(
  'settle-bets-every-10-minutes',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://iqhvtjoknnyflrqxifud.supabase.co/functions/v1/settle-bets',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
