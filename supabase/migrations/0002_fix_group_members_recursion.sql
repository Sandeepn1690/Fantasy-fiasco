-- Fixes "infinite recursion detected in policy for relation group_members".
--
-- The original select policy on group_members checked membership by querying
-- group_members itself, which makes Postgres recursively re-evaluate the same
-- policy forever. The standard fix is a SECURITY DEFINER helper function:
-- it runs as the function owner (which bypasses RLS by default), so calling
-- it from inside the policy no longer re-triggers the policy it's used in.

create or replace function user_group_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from group_members where user_id = auth.uid();
$$;

drop policy if exists "members can read their own membership rows" on group_members;

create policy "members can read their own membership rows"
  on group_members for select
  using (
    user_id = auth.uid()
    or group_id in (select user_group_ids())
  );
