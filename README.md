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
[API-Football](https://www.api-football.com) (free tier: 100 requests/day —
plenty for polling once every few minutes during matchdays) and settles
finished matches.

1. Get a free API key from api-football.com (or api-sports.io).
2. Deploy the function and set its secrets:
   ```bash
   supabase functions deploy sync-fixtures
   supabase secrets set API_FOOTBALL_KEY=your-key-here
   ```
3. Schedule it with `pg_cron` (see the comment at the top of
   `supabase/functions/sync-fixtures/index.ts` for the exact SQL) so it runs
   every few minutes during the tournament.

> Free-tier API-Football is capped at 100 requests/day. That's fine for
> match-result polling (one call covers a whole day's fixtures), but if you
> need tighter live-score granularity or the league grows a lot, you'll want
> a paid tier.

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
