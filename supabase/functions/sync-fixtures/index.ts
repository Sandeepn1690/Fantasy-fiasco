// Supabase Edge Function: sync-fixtures
//
// Polls worldcup26.ir (https://github.com/rezarahiminia/worldcup2026) — a free,
// community-run API specifically for the 2026 FIFA World Cup — for fixtures,
// upserts them into `fixtures`, and settles any fixture that has just
// finished by calling the `settle_fixture` Postgres function.
//
// For knockout matches that end tied (going to penalties), worldcup26.ir has
// no penalty-shootout field. Instead we query ESPN's public scoreboard API
// (no key required) which exposes shootoutScore per competitor and
// STATUS_FINAL_PEN status, letting us auto-detect the penalty winner.
//
// Schedule this with pg_cron, e.g. every 5 minutes during the tournament:
//   select cron.schedule('sync-fixtures', '*/5 * * * *',
//     $$ select net.http_post(
//       url := '<your-project-ref>.supabase.co/functions/v1/sync-fixtures',
//       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//     ) $$);
//
// Required secrets (set via `supabase secrets set`):
//   WORLDCUP26_TOKEN          - JWT from https://worldcup26.ir/auth/register
//                               or /auth/authenticate (expires after 84 days —
//                               re-register/re-authenticate and update this
//                               secret if syncing stops working)
//   SUPABASE_URL              - auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY - auto-injected by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WORLDCUP26_BASE = 'https://worldcup26.ir'
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

// worldcup26.ir's local_date is "MM/DD/YYYY HH:mm" with no timezone marker.
// Confirmed by checking real kickoff slots (e.g. "12:00", "15:00", "18:00")
// against the tournament's actual US broadcast schedule: these are US Eastern
// Time, not UTC. The whole tournament window (June 11 - July 19, 2026) falls
// within US Daylight Saving Time, so Eastern is a fixed UTC-4 offset for the
// entire World Cup — no DST edge cases to handle.
function parseLocalDate(localDate: string): string {
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour + 4, minute)).toISOString()
}

function parseScore(value: unknown): number | null {
  if (value == null) return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

// Returns true if a meaningful word from `ourName` appears in `espnName`.
// Handles cases like "Korea Republic" matching "South Korea", or
// "Democratic Republic of the Congo" matching "Congo DR".
function nameMatches(ourName: string, espnName: string): boolean {
  const espnLower = espnName.toLowerCase()
  return ourName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .some((w) => espnLower.includes(w))
}

// Queries ESPN's public scoreboard for the given date (in Eastern Time, which
// is how ESPN groups World Cup matches) and returns 'home' or 'away' if one
// competitor won on penalties, or null if the data isn't available yet.
async function fetchPenaltyWinner(
  kickoffAt: string,
  homeTeam: string,
  awayTeam: string,
): Promise<'home' | 'away' | null> {
  // ESPN groups matches by Eastern Time date. Convert kickoff (stored UTC) to
  // ET (UTC-4 for the whole tournament) before extracting the date string.
  const etMs = new Date(kickoffAt).getTime() - 4 * 60 * 60 * 1000
  const dateStr = new Date(etMs).toISOString().slice(0, 10).replace(/-/g, '')

  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${dateStr}`)
    if (!res.ok) return null

    const { events = [] } = await res.json()

    for (const event of events) {
      const competition = event.competitions?.[0]
      if (!competition) continue
      if (competition.status?.type?.name !== 'STATUS_FINAL_PEN') continue

      const competitors: Array<{ team: { displayName: string }; shootoutScore: number; homeAway: string }> =
        competition.competitors ?? []
      if (competitors.length !== 2) continue

      // Confirm both of our teams appear in this ESPN event
      const home = competitors.find((c) => c.homeAway === 'home')
      const away = competitors.find((c) => c.homeAway === 'away')
      if (!home || !away) continue

      const homeName = home.team?.displayName ?? ''
      const awayName = away.team?.displayName ?? ''

      const homeMatches = nameMatches(homeTeam, homeName) || nameMatches(homeName, homeTeam)
      const awayMatches = nameMatches(awayTeam, awayName) || nameMatches(awayName, awayTeam)
      if (!homeMatches || !awayMatches) continue

      // Higher shootoutScore wins
      if ((home.shootoutScore ?? 0) > (away.shootoutScore ?? 0)) return 'home'
      if ((away.shootoutScore ?? 0) > (home.shootoutScore ?? 0)) return 'away'
    }
  } catch {
    // ESPN unavailable — leave result null, will retry next sync cycle
  }

  return null
}

Deno.serve(async () => {
  const token = Deno.env.get('WORLDCUP26_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return new Response('Missing required environment variables', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const response = await fetch(`${WORLDCUP26_BASE}/get/games`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return new Response(`worldcup26.ir request failed: ${response.status}`, { status: 502 })
  }

  const { games } = await response.json()
  const settled = []
  const upserted = []

  for (const game of games ?? []) {
    const externalId = String(game.id)
    const isFinished = game.finished === 'TRUE'
    // worldcup26.ir returns the literal string "null" (not real null) for
    // not-yet-played matches. Number("null") is NaN, which !== the real null
    // stored in the DB on every comparison — that mismatch was making this
    // function think every not-yet-started fixture had "changed" forever.
    const homeScore = parseScore(game.home_score)
    const awayScore = parseScore(game.away_score)
    const kickoffAt = parseLocalDate(game.local_date)

    const { data: existing } = await supabase.from('fixtures').select('*').eq('external_id', externalId).maybeSingle()

    const isKnockout = game.type && game.type !== 'group'
    const isTied = homeScore === awayScore

    // Knockout fixtures whose bracket slot isn't decided yet have no real
    // team assigned (home_team_id/away_team_id are "0"); worldcup26.ir gives
    // a placeholder like "Winner Match 86" via *_team_label instead of
    // *_team_name_en in that case.
    const homeTeam = game.home_team_name_en || game.home_team_label || 'TBD'
    const awayTeam = game.away_team_name_en || game.away_team_label || 'TBD'

    let result = existing?.result ?? null
    if (!result && isFinished && homeScore != null && awayScore != null) {
      if (isKnockout && isTied) {
        // worldcup26.ir has no penalty-shootout field. Query ESPN which does
        // expose shootoutScore — returns null if the match isn't final yet,
        // in which case we leave result null and retry next cycle.
        result = await fetchPenaltyWinner(kickoffAt, homeTeam, awayTeam)
      } else {
        result = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
      }
    }

    const status = isFinished
      ? 'finished'
      : new Date(kickoffAt) <= new Date()
        ? 'live'
        : 'scheduled'

    const newRow = {
      external_id: externalId,
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff_at: kickoffAt,
      status,
      home_score: homeScore,
      away_score: awayScore,
      result,
      stage: game.type ?? null,
    }

    // Skip the write entirely if nothing actually changed. Without this,
    // every sync rewrites all ~104 fixtures regardless of whether anything
    // moved, which fires a Realtime change event per row and made the app
    // visibly flicker every 5 minutes for no reason.
    const unchanged =
      existing &&
      existing.home_team === newRow.home_team &&
      existing.away_team === newRow.away_team &&
      new Date(existing.kickoff_at).getTime() === new Date(newRow.kickoff_at).getTime() &&
      existing.status === newRow.status &&
      existing.home_score === newRow.home_score &&
      existing.away_score === newRow.away_score &&
      existing.result === newRow.result &&
      existing.stage === newRow.stage

    if (unchanged) continue

    const { data: row, error: upsertError } = await supabase
      .from('fixtures')
      .upsert(newRow, { onConflict: 'external_id' })
      .select()
      .single()

    if (upsertError) {
      console.error(`Failed to upsert fixture ${externalId}:`, upsertError.message)
      continue
    }
    upserted.push(externalId)

    // Settle once: only when this fixture just got a result for the first time.
    if (result && !existing?.result) {
      const { error: settleError } = await supabase.rpc('settle_fixture', { p_fixture_id: row.id })
      if (settleError) {
        console.error(`Failed to settle fixture ${externalId}:`, settleError.message)
      } else {
        settled.push(externalId)
      }
    }
  }

  return new Response(JSON.stringify({ upserted: upserted.length, settled }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
