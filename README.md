# 🏈 Fantasy Fiasco

The official home of our fantasy league — standings, teams, schedule, rules, and (most importantly) trash talk. Built with **React + Vite** and ready to deploy to **Netlify** or **Vercel**.

## Project structure

```
Fantasy Fiasco/
├── index.html              # App entry HTML
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite + React config
├── netlify.toml            # Netlify build + SPA redirects
├── vercel.json             # Vercel SPA rewrites
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # React/Router bootstrap
    ├── App.jsx             # Routes
    ├── components/         # Navbar, Footer
    ├── pages/              # Home, Standings, Members, Schedule, Rules, TrashTalk, NotFound
    ├── data/league.js      # ← Edit your league data here
    └── styles/index.css    # Global styles
```

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install     # install dependencies (first time only)
npm run dev     # start dev server → http://localhost:5173
```

Other commands:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build locally
```

## Customize your league

All content lives in **`src/data/league.js`** — edit the `TEAMS`, `SCHEDULE`,
`RULES`, and `TRASH_TALK` arrays and the whole site updates. No need to touch
the components.

## Deploy online

The project includes config for both hosts. Either way, **push this folder to a
GitHub repo first**, then connect it:

### Option A — Netlify
1. Go to [netlify.com](https://netlify.com) and "Add new site → Import an existing project".
2. Pick your GitHub repo. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Click **Deploy**. You'll get a live `*.netlify.app` URL to share.

### Option B — Vercel
1. Go to [vercel.com](https://vercel.com) → "Add New → Project" and import the repo.
2. Vercel auto-detects Vite. `vercel.json` handles SPA routing.
3. Click **Deploy** → you get a live `*.vercel.app` URL.

> Both offer a free tier and let you add a custom domain in their dashboard.

### Quick deploy without GitHub
You can also drag the `dist/` folder (after `npm run build`) straight onto
[app.netlify.com/drop](https://app.netlify.com/drop) for an instant link.

## Notes
- Trash Talk posts are stored in browser memory only (reset on refresh). To make
  them permanent, connect a backend or a service like Supabase/Firebase.
