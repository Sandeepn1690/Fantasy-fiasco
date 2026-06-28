// Supabase Edge Function: sync-fixtures
//
// Polls API-Football (https://www.api-football.com, free tier) for World Cup
// fixtures, upserts them into `fixtures`, and settles any fixture that has
// just finished by calling the `settle_fixture` Postgres function.
//
// Schedule this with pg_cron, e.g. every 5 minutes during the tournament:
//   select cron.schedule('sync-fixtures', '*/5 * * * *',
//     $$ select net.http_post(
//       url := '<your-project-ref>.supabase.co/functions/v1/sync-fixtures',
//       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//     ) $$);
//
// Required secrets (set via `supabase secrets set`):
//   API_FOOTBALL_KEY        - your api-football.com / api-sports.io key
//   SUPABASE_URL             - auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY - auto-injected by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE_ID = 1 // FIFA World Cup in API-Football's league catalogue
const SEASON = 2026

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])

Deno.serve(async () => {
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response('Missing required environment variables', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const today = new Date().toISOString().slice(0, 10)
  const response = await fetch(
    `${API_FOOTBALL_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}&date=${today}`,
    { headers: { 'x-apisports-key': apiKey } }
  )

  if (!response.ok) {
    return new Response(`API-Football request failed: ${response.status}`, { status: 502 })
  }

  const { response: apiFixtures } = await response.json()
  const settled = []
  const upserted = []

  for (const item of apiFixtures ?? []) {
    const externalId = String(item.fixture.id)
    const statusShort = item.fixture.status.short
    const homeScore = item.goals.home
    const awayScore = item.goals.away

    const { data: existing } = await supabase
      .from('fixtures')
      .select('id, result')
      .eq('external_id', externalId)
      .maybeSingle()

    let result = existing?.result ?? null
    if (!result && FINISHED_STATUSES.has(statusShort) && homeScore != null && awayScore != null) {
      result = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw'
    }

    const { data: row, error: upsertError } = await supabase
      .from('fixtures')
      .upsert(
        {
          external_id: externalId,
          home_team: item.teams.home.name,
          away_team: item.teams.away.name,
          kickoff_at: item.fixture.date,
          status: FINISHED_STATUSES.has(statusShort) ? 'finished' : statusShort === 'NS' ? 'scheduled' : 'live',
          home_score: homeScore,
          away_score: awayScore,
          result,
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

  return new Response(JSON.stringify({ upserted, settled }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
