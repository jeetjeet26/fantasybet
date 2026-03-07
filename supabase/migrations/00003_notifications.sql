-- In-app notifications (Phase 4)
create type notification_type as enum ('slate_ready', 'invite');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_read on notifications(user_id, read_at);
alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications (mark read)"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No INSERT policy: only service role (edge functions) can insert notifications
