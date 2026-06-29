// Supabase Edge Function: sync-fixtures
//
// Polls worldcup26.ir (https://github.com/rezarahiminia/worldcup2026) — a free,
// community-run API specifically for the 2026 FIFA World Cup — for fixtures,
// upserts them into `fixtures`, and settles any fixture that has just
// finished by calling the `settle_fixture` Postgres function.
//
// NOTE: this is an unofficial, community-run data source (not an
// official/vetted provider). It was chosen because API-Football's free tier
// does not include the 2026 season at all (confirmed by testing — only
// 2022-2024 seasons are available for free).
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

// worldcup26.ir's local_date is "MM/DD/YYYY HH:mm" with no timezone marker.
// We treat it as UTC, which may be off by a few hours from the true kickoff
// time depending on host-venue timezone — acceptable for lock-at-kickoff
// purposes, but worth knowing if picks ever lock earlier/later than expected.
function parseLocalDate(localDate: string): string {
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart}:00Z`).toISOString()
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
    const homeScore = game.home_score != null ? Number(game.home_score) : null
    const awayScore = game.away_score != null ? Number(game.away_score) : null
    const kickoffAt = parseLocalDate(game.local_date)

    const { data: existing } = await supabase
      .from('fixtures')
      .select('id, result')
      .eq('external_id', externalId)
      .maybeSingle()

    let result = existing?.result ?? null
    if (!result && isFinished && homeScore != null && awayScore != null) {
      result = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
    }

    const status = isFinished
      ? 'finished'
      : new Date(kickoffAt) <= new Date()
        ? 'live'
        : 'scheduled'

    // Knockout fixtures whose bracket slot isn't decided yet have no real
    // team assigned (home_team_id/away_team_id are "0"); worldcup26.ir gives
    // a placeholder like "Winner Match 86" via *_team_label instead of
    // *_team_name_en in that case.
    const homeTeam = game.home_team_name_en || game.home_team_label || 'TBD'
    const awayTeam = game.away_team_name_en || game.away_team_label || 'TBD'

    const { data: row, error: upsertError } = await supabase
      .from('fixtures')
      .upsert(
        {
          external_id: externalId,
          home_team: homeTeam,
          away_team: awayTeam,
          kickoff_at: kickoffAt,
          status,
          home_score: homeScore,
          away_score: awayScore,
          result,
          stage: game.type ?? null,
        },
        { onConflict: 'external_id' }
      )
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
