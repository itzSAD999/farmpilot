-- ============================================================
-- FarmPilot — Migration 006
-- Fixes: handle_new_user() trigger was not copying full_name
-- from user metadata into the profiles table.
-- Also backfills existing accounts.
-- ============================================================

-- 1. Replace the trigger function to include full_name
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, phone, email, full_name, auth_method)
  values (
    new.id,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'real_email',
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'auth_method', 'phone')
  );
  return new;
end;
$$;

-- 2. Backfill existing profiles that are missing full_name
-- but have it stored in auth.users.raw_user_meta_data
update profiles p
set full_name = u.raw_user_meta_data->>'full_name'
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.full_name = '')
  and u.raw_user_meta_data->>'full_name' is not null
  and u.raw_user_meta_data->>'full_name' != '';
