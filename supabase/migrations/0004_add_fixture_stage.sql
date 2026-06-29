-- Adds the match stage (group, r32, r16, qf, sf, third, final) so the app
-- can tell knockout matches apart from group matches — knockout games can't
-- end in a draw (extra time/penalties decide a winner), so they shouldn't
-- offer a "Draw" pick the way group matches do.
alter table fixtures add column if not exists stage text;
