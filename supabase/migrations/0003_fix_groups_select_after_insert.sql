-- Fixes "new row violates row-level security policy for table groups" on
-- group creation. The INSERT policy itself was correct, but the app does
-- .insert(...).select().single(), which asks Postgres to immediately read
-- back the new row. That read is checked against the SELECT policy, which
-- only allowed members (via group_members) to see a group — and the
-- after-insert trigger that adds the owner as a member isn't guaranteed to
-- be visible in time for that same-statement read-back. Letting the SELECT
-- policy also recognize the owner directly removes that race entirely.

drop policy if exists "members can read their groups" on groups;

create policy "members can read their groups"
  on groups for select
  using (
    owner_id = auth.uid()
    or id in (select user_group_ids())
  );
