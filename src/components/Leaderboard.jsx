import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ groupId }) {
  const [rows, setRows] = useState([])
  const [liveBonus, setLiveBonus] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`leaderboard-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  async function load() {
    const [{ data: leaderboardRows, error }, { data: members }, { data: liveFixtures }] = await Promise.all([
      supabase.from('leaderboard').select('*').eq('group_id', groupId),
      supabase.from('group_members').select('user_id').eq('group_id', groupId),
      supabase.from('fixtures').select('id, home_score, away_score').eq('status', 'live'),
    ])

    if (!error) setRows(leaderboardRows ?? [])

    const bonus = {}
    if (liveFixtures?.length && members?.length) {
      const memberIds = members.map((m) => m.user_id)
      const liveIds = liveFixtures.map((f) => f.id)
      const { data: livePredictions } = await supabase
        .from('predictions')
        .select('user_id, fixture_id, predicted_result')
        .in('fixture_id', liveIds)
        .in('user_id', memberIds)

      const resultByFixture = {}
      for (const f of liveFixtures) {
        if (f.home_score == null || f.away_score == null) continue
        resultByFixture[f.id] = f.home_score > f.away_score ? 'home' : f.home_score < f.away_score ? 'away' : 'draw'
      }

      for (const p of livePredictions ?? []) {
        if (resultByFixture[p.fixture_id] && resultByFixture[p.fixture_id] === p.predicted_result) {
          bonus[p.user_id] = (bonus[p.user_id] ?? 0) + 5
        }
      }
    }
    setLiveBonus(bonus)
    setLoading(false)
  }

  if (loading) return <p className="loading">Loading leaderboard…</p>
  if (rows.length === 0) return <p className="empty-state">No members yet.</p>

  const sorted = rows
    .map((row) => ({ ...row, projected: row.total_points + (liveBonus[row.user_id] ?? 0) }))
    .sort((a, b) => b.projected - a.projected)

  // Standard competition ranking: tied scores share a rank, and the next
  // distinct score resumes at its actual position (e.g. 1,1,1,1,5 — not
  // 1,2,3,4,5 — when four people are tied for first).
  let rank = 0
  let previousScore = null
  const ranked = sorted.map((row, i) => {
    if (row.projected !== previousScore) {
      rank = i + 1
      previousScore = row.projected
    }
    return { ...row, rank }
  })

  const anyLive = Object.keys(liveBonus).length > 0

  return (
    <div className="table-wrap">
      {anyLive && <p className="live-leaderboard-note">⚡ Includes projected points from matches in progress</p>}
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((row) => (
            <tr key={row.user_id}>
              <td className="rank">{MEDALS[row.rank - 1] ?? `#${row.rank}`}</td>
              <td>{row.username}</td>
              <td className="num">
                {row.projected}
                {liveBonus[row.user_id] > 0 && <span className="live-bonus"> (+{liveBonus[row.user_id]} live)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
