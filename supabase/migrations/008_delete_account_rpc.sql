-- ============================================================  
-- FarmPilot - Migration 008  
-- Adds RPC function for users to delete their own account from auth.users.  
-- ============================================================  
  
create or replace function delete_my_account()  
returns void  
language plpgsql  
security definer  
set search_path = public, auth  
as   
begin  
  if auth.uid() is not null then  
    delete from auth.users where id = auth.uid();  
  end if;  
end;  
; 
