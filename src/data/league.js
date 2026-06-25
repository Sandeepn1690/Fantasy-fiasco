// Central place for league data. Edit this file to update your league —
// the whole site reads from here.

export const LEAGUE = {
  name: 'Fantasy Fiasco',
  season: '2026',
  tagline: 'Where friendships go to die and trophies go to gloat.',
}

export const TEAMS = [
  { id: 1, team: 'Gridiron Goblins',   owner: 'Sandeep',  w: 9, l: 2, pf: 1342.6, pa: 1180.2, streak: 'W4', color: '#f59e0b' },
  { id: 2, team: 'Touchdown Tyrants',  owner: 'Maya',     w: 8, l: 3, pf: 1310.1, pa: 1201.8, streak: 'W2', color: '#38bdf8' },
  { id: 3, team: 'Hail Mary Heroes',   owner: 'Devon',    w: 7, l: 4, pf: 1288.4, pa: 1245.0, streak: 'L1', color: '#a78bfa' },
  { id: 4, team: 'The Blitz Brigade',  owner: 'Priya',    w: 6, l: 5, pf: 1255.9, pa: 1260.7, streak: 'W1', color: '#22c55e' },
  { id: 5, team: 'End Zone Enforcers', owner: 'Carlos',   w: 6, l: 5, pf: 1240.3, pa: 1238.5, streak: 'L2', color: '#f472b6' },
  { id: 6, team: 'Pocket Predators',   owner: 'Aisha',    w: 5, l: 6, pf: 1199.7, pa: 1270.4, streak: 'W1', color: '#fb7185' },
  { id: 7, team: 'Fumble Factory',     owner: 'Jordan',   w: 3, l: 8, pf: 1102.5, pa: 1320.9, streak: 'L3', color: '#34d399' },
  { id: 8, team: 'Bench Warmers',      owner: 'Riley',    w: 2, l: 9, pf: 1054.8, pa: 1356.1, streak: 'L5', color: '#facc15' },
]

export const SCHEDULE = [
  {
    week: 'Week 12 — Upcoming',
    games: [
      { home: 'Gridiron Goblins', away: 'Bench Warmers' },
      { home: 'Touchdown Tyrants', away: 'Fumble Factory' },
      { home: 'Hail Mary Heroes', away: 'Pocket Predators' },
      { home: 'The Blitz Brigade', away: 'End Zone Enforcers' },
    ],
  },
  {
    week: 'Week 13',
    games: [
      { home: 'Gridiron Goblins', away: 'Touchdown Tyrants' },
      { home: 'Hail Mary Heroes', away: 'The Blitz Brigade' },
      { home: 'End Zone Enforcers', away: 'Pocket Predators' },
      { home: 'Fumble Factory', away: 'Bench Warmers' },
    ],
  },
  {
    week: 'Week 14 — Playoffs Round 1',
    games: [
      { home: '#1 Seed', away: '#4 Seed' },
      { home: '#2 Seed', away: '#3 Seed' },
    ],
  },
]

export const RULES = [
  { title: 'Roster & Scoring', text: 'Standard PPR. Starting lineup: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 D/ST, 1 K. Six-player bench.' },
  { title: 'Waivers', text: 'FAAB budget of $100 per team. Waivers process Wednesday at 3:00 AM. Free agency is first-come, first-served after.' },
  { title: 'Trades', text: 'Trade deadline is Week 11. All trades are subject to a 24-hour league review — three veto votes cancels a trade.' },
  { title: 'Playoffs', text: 'Top 4 teams make the playoffs. Weeks 14–16. Higher seed gets the home-field tiebreaker on equal scores.' },
  { title: 'Dues & Payouts', text: '$50 buy-in. 1st place: 70%, 2nd place: 20%, Regular-season points leader: 10%. Last place buys the draft-day pizza.' },
  { title: 'The Golden Rule', text: 'Trash talk is mandatory. Poor sportsmanship after a win is encouraged. Ghosting your lineup is a cardinal sin.' },
]

export const TRASH_TALK = [
  { id: 1, name: 'Maya', team: 'Touchdown Tyrants', time: '2h ago', body: 'Enjoy the regular-season crown Sandeep — we both know it melts in the playoffs. 🏆➡️💧' },
  { id: 2, name: 'Jordan', team: 'Fumble Factory', time: '5h ago', body: 'Lost by 1.4 points because my kicker missed a chip shot. I am never emotionally recovering from this.' },
  { id: 3, name: 'Sandeep', team: 'Gridiron Goblins', time: '1d ago', body: 'Four-game win streak and counting. The Goblins do not negotiate with the bottom of the standings. 😈' },
  { id: 4, name: 'Riley', team: 'Bench Warmers', time: '2d ago', body: 'On the bright side, I have already locked up the last-place pizza order. Pepperoni for everyone.' },
]
