-- Fixes streak corruption caused by out-of-order or manual re-settlements.
--
-- The original settle_fixture incremented current_streak by +1 (or reset to 0)
-- based on the counter's current value. Any re-settlement (e.g. correcting a
-- penalty-shootout result) ran the same logic again on an already-modified
-- counter, producing the wrong streak.
--
-- The fix: after awarding base points, recompute the streak from scratch using
-- the full settled-prediction history for that user. The result is always
-- derived from ground truth, so re-settlements and out-of-order settlements
-- can never corrupt it.

create or replace function settle_fixture(p_fixture_id uuid)
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
    order by p.created_at
  loop
    v_correct := (v_pred.predicted_result = v_result);
    v_points  := case when v_correct then 5 else 0 end;

    -- Write base points first so this prediction is included in the streak
    -- query below (it filters on points_awarded IS NOT NULL).
    update predictions set points_awarded = v_points where id = v_pred.id;

    -- Recompute streak from the full settled-prediction history.
    -- Orders picks by kickoff DESC, counts consecutive correct from the top
    -- until the first wrong pick (standard "streak from recent" logic).
    select coalesce(
      min(rn) filter (where not correct) - 1,
      count(*)
    )::integer into v_new_streak
    from (
      select
        (pr.points_awarded > 0) as correct,
        row_number() over (order by f.kickoff_at desc) as rn
      from predictions pr
      join fixtures f on f.id = pr.fixture_id
      where pr.user_id = v_pred.user_id
        and pr.points_awarded is not null
    ) ordered;

    update profiles set current_streak = v_new_streak where id = v_pred.user_id;

    if v_correct and v_new_streak % 3 = 0 then
      v_points := v_points + 10;
      update predictions set points_awarded = v_points where id = v_pred.id;
    end if;
  end loop;

  update fixtures set settled_at = now() where id = p_fixture_id;
end;
$$;
