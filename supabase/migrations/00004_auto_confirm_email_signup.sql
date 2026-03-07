-- Auto-confirm email/password users so testing works without email provider.
-- This updates the existing auth.users trigger function used on signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;

-- Backfill existing unconfirmed users for local/dev testing.
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
