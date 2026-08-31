-- ============================================================
-- Migration: 004_notifications
-- Description: Adds notifications table and trigger for limit alerts.
-- ============================================================

create table notifications (
  id                  bigserial primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  message             text not null,
  type                text not null default 'info', -- 'info', 'alert', 'limit_reached'
  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

create index notifications_user_id_idx on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy notifications_own on notifications for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trigger to notify on estimate limit reach
create or replace function notify_on_estimate_flag()
returns trigger as $$
declare
  v_user_id uuid;
  v_crop_name text;
  v_farm_name text;
begin
  -- Only trigger if the row is flagged and it's a new row (or newly flagged)
  if (TG_OP = 'INSERT' and new.is_flagged = true) or 
     (TG_OP = 'UPDATE' and new.is_flagged = true and old.is_flagged = false) then
     
    -- Get user, farm, and crop context
    select f.user_id, c.name, f.name into v_user_id, v_crop_name, v_farm_name
    from estimates e
    join seasons s on e.season_id = s.id
    join farms f on s.farm_id = f.id
    join crops c on s.crop_id = c.id
    where e.id = new.estimate_id;
    
    if found then
      insert into notifications (user_id, title, message, type)
      values (
        v_user_id, 
        'Overspend Alert: ' || new.category,
        'Your estimated cost for ' || new.category || ' on your ' || v_crop_name || ' farm (' || v_farm_name || ') exceeds standard benchmarks. Review your estimate report for optimization advice.',
        'limit_reached'
      );
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_estimate_flag_trigger on estimate_lines;
create trigger on_estimate_flag_trigger
  after insert or update on estimate_lines
  for each row
  execute function notify_on_estimate_flag();
