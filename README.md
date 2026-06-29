# 🏆 Fantasy Fiasco — World Cup Predictions

Register, create or join a private group, and predict the outcome (home win /
draw / away win) of every World Cup match. Correct picks score 5 points, and
hitting 3-in-a-row (then 6, 9, ...) earns a +10 streak bonus. Results sync in
live and your group's leaderboard updates without a refresh.

Built with **React + Vite** for the frontend and **Supabase** (Postgres, Auth,
Realtime, Edge Functions) for the backend.

## Project structure

```
Fantasy Fiasco/
├── index.html                      # App entry HTML
├── package.json                    # Dependencies & scripts
├── vite.config.js                  # Vite + React config
├── .env.example                    # Supabase env vars to copy into .env
├── supabase/
│   ├── migrations/0001_init.sql    # Schema, RLS, settlement logic, leaderboard view
│   └── functions/sync-fixtures/    # Edge Function that polls live match data
└── src/
    ├── main.jsx                    # React/Router bootstrap
    ├── App.jsx                     # Routes
    ├── contexts/AuthContext.jsx    # Supabase auth session state
    ├── lib/supabaseClient.js       # Supabase client
    ├── components/                 # Navbar, Footer, Predictions, Leaderboard
    ├── pages/                      # Home, Login, Register, Groups, Group, NotFound
    └── styles/index.css            # Global styles
```

## Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` — this creates
   all tables, Row Level Security policies, the `settle_fixture` function,
   and the `leaderboard` view.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key
   (Project Settings → API).

## Set up live match syncing

The `sync-fixtures` Edge Function pulls World Cup fixtures/results from
[worldcup26.ir](https://worldcup26.ir) — a free, community-run API built
specifically for the 2026 tournament (API-Football's free tier doesn't
include the 2026 season at all, only 2022-2024) — and settles finished
matches.

1. Register for a token (any email/password, no approval needed):
   ```bash
   curl -X POST "https://worldcup26.ir/auth/register" -H "Content-Type: application/json" \
     -d '{"name":"Your Name","email":"you@example.com","password":"SomePassword123!"}'
   ```
   Copy the `token` from the response (it's valid for 84 days).
2. Deploy the function and set its secret:
   ```bash
   supabase functions deploy sync-fixtures
   supabase secrets set WORLDCUP26_TOKEN=your-token-here
   ```
3. Schedule it with `pg_cron` (see the comment at the top of
   `supabase/functions/sync-fixtures/index.ts` for the exact SQL) so it runs
   every few minutes during the tournament.

> This is an unofficial, community-run data source, not an official/vetted
> provider — chosen because it's free and actually covers the 2026 season.
> The token expires after 84 days; if syncing silently stops, re-register and
> update the secret.

### Manually settling a penalty shootout

worldcup26.ir has no field for penalty-shootout results. A knockout match
that's tied after 90 minutes always has a real winner (decided on penalties),
but the sync function can't know who — so it deliberately leaves that
fixture **unsettled** (status `finished`, `result` still `null`) instead of
wrongly recording a draw. Predictions on it just won't show points until you
fix it manually:

1. Find the fixture's id and confirm it's the stuck one:
   ```sql
   select id, home_team, away_team, home_score, away_score
   from fixtures
   where status = 'finished' and result is null;
   ```
2. Check the real result (news/official source) and set the winner — `'home'`
   or `'away'` depending on who actually won the shootout:
   ```sql
   update fixtures set result = 'home' where id = '<fixture-id-from-step-1>';
   select settle_fixture('<fixture-id-from-step-1>');
   ```

## Run it locally

You need [Node.js](https://nodejs.org) **18+** installed (the Supabase client
and Vite 5 require it).

```bash
npm install     # install dependencies (first time only)
npm run dev     # start dev server → http://localhost:5173
```

Other commands:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build locally
```

## How the game works

- **Register** with email/password, then **create a group** (you get a
  shareable invite code) or **join one** with a friend's code.
- On the **Predictions** tab, pick home/draw/away for each fixture any time
  before kickoff — picks lock automatically once the match starts.
- **5 points** for a correct pick. Every time your consecutive-correct streak
  hits a multiple of 3 (3, 6, 9, ...), you get a **+10 bonus** on top.
- The **Leaderboard** tab is live — once a match is settled, everyone's points
  update for all logged-in group members without needing to refresh.

## Deploy online

Push this folder to a GitHub repo, then import it into Netlify or Vercel as
before (`netlify.toml` / `vercel.json` are already configured for SPA
routing). Add your `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as
environment variables in the host's dashboard — they're public-safe (the anon
key is meant to be used client-side; access control is enforced by the RLS
policies in the migration, not by hiding the key).
