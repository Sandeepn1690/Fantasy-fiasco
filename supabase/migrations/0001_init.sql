-- Fantasy Fiasco: World Cup predictions league
-- Schema, RLS, and settlement logic for the prediction game.

-- ── profiles ─────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  current_streak integer not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── groups ───────────────────────────────────────────────────────────────
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  owner_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table groups enable row level security;
alter table group_members enable row level security;

create policy "members can read their groups"
  on groups for select
  using (
    id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "users can create groups"
  on groups for insert
  with check (auth.uid() = owner_id);

create policy "members can read their own membership rows"
  on group_members for select
  using (
    group_id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "users can join a group themselves"
  on group_members for insert
  with check (auth.uid() = user_id);

-- A new group's owner is automatically a member.
create function handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;

create trigger on_group_created
  after insert on groups
  for each row execute function handle_new_group();

-- Joining requires looking a group up by invite code, but the select policy
-- above only lets members read groups they're already in. This function runs
-- as the table owner so it can find the group by code and add the caller as
-- a member in one step, without exposing all groups to anonymous lookups.
create function join_group_by_code(p_invite_code text)
returns groups
language plpgsql
security definer set search_path = public
as $$
declare
  v_group groups;
begin
  select * into v_group from groups where invite_code = p_invite_code;
  if v_group.id is null then
    raise exception 'No group found with that invite code';
  end if;

  insert into group_members (group_id, user_id)
  values (v_group.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

-- ── fixtures ─────────────────────────────────────────────────────────────
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | live | finished
  home_score integer,
  away_score integer,
  result text, -- 'home' | 'away' | 'draw', set once finished
  settled_at timestamptz
);

alter table fixtures enable row level security;

create policy "fixtures are publicly readable"
  on fixtures for select
  using (true);

-- Only the sync edge function (service role) writes fixtures; no insert/update
-- policy is defined for regular users, so RLS denies client writes by default.

-- ── predictions ──────────────────────────────────────────────────────────
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  fixture_id uuid not null references fixtures (id) on delete cascade,
  predicted_result text not null check (predicted_result in ('home', 'away', 'draw')),
  points_awarded integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

alter table predictions enable row level security;

create policy "users can read their own predictions"
  on predictions for select
  using (auth.uid() = user_id);

-- Group-mates can see each other's locked-in picks once kickoff has passed,
-- so the predictions tab can show "what everyone guessed" after the fact.
create policy "group-mates can read settled predictions"
  on predictions for select
  using (
    exists (
      select 1
      from fixtures f
      where f.id = predictions.fixture_id
        and f.kickoff_at <= now()
    )
    and exists (
      select 1
      from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = predictions.user_id
        and gm2.user_id = auth.uid()
    )
  );

create policy "users can submit predictions before kickoff"
  on predictions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = predictions.fixture_id and f.kickoff_at > now()
    )
  );

create policy "users can change predictions before kickoff"
  on predictions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from fixtures f
      where f.id = predictions.fixture_id and f.kickoff_at > now()
    )
  );

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_set_updated_at
  before update on predictions
  for each row execute function set_updated_at();

-- ── settlement ───────────────────────────────────────────────────────────
-- Scoring: 5 points for a correct prediction. Every time a user's
-- consecutive-correct streak hits a multiple of 3 (3, 6, 9, ...), an extra
-- +10 bonus is added on top of the 5 for that pick.
create function settle_fixture(p_fixture_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_result text;
  v_pred record;
  v_correct boolean;
  v_points integer;
  v_new_streak integer;
begin
  select result into v_result from fixtures where id = p_fixture_id;
  if v_result is null then
    raise exception 'fixture % has no result yet', p_fixture_id;
  end if;

  for v_pred in
    select p.id, p.user_id, p.predicted_result
    from predictions p
    where p.fixture_id = p_fixture_id
    order by p.created_at -- stable order; streak correctness relies on
                           -- fixtures being settled in kickoff order overall
  loop
    v_correct := (v_pred.predicted_result = v_result);
    v_points := case when v_correct then 5 else 0 end;

    update profiles
    set current_streak = case when v_correct then current_streak + 1 else 0 end
    where id = v_pred.user_id
    returning current_streak into v_new_streak;

    if v_correct and v_new_streak % 3 = 0 then
      v_points := v_points + 10;
    end if;

    update predictions set points_awarded = v_points where id = v_pred.id;
  end loop;

  update fixtures set settled_at = now() where id = p_fixture_id;
end;
$$;

-- ── leaderboard ──────────────────────────────────────────────────────────
create view leaderboard as
select
  gm.group_id,
  gm.user_id,
  p.username,
  coalesce(sum(pr.points_awarded), 0) as total_points
from group_members gm
join profiles p on p.id = gm.user_id
left join predictions pr on pr.user_id = gm.user_id
group by gm.group_id, gm.user_id, p.username
order by total_points desc;

-- ── realtime ─────────────────────────────────────────────────────────────
-- The leaderboard view can't be subscribed to directly, so the frontend
-- subscribes to changes on these underlying tables and refetches the view.
alter publication supabase_realtime add table predictions;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table fixtures;
