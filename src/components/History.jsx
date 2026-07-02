import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { flagFor } from '../lib/flags.js'
import { shortNameFor } from '../lib/teamNames.js'

export default function History() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('predictions')
      .select('predicted_result, points_awarded, fixtures(home_team, away_team, kickoff_at, home_score, away_score, result)')
      .eq('user_id', user.id)
      .not('points_awarded', 'is', null)

    const sorted = (data ?? []).sort(
      (a, b) => new Date(b.fixtures.kickoff_at) - new Date(a.fixtures.kickoff_at)
    )
    setRows(sorted)
    setLoading(false)
  }

  if (loading) return <p className="loading">Loading history…</p>
  if (rows.length === 0) return <p className="empty-state">No settled results yet.</p>

  const totalPoints = rows.reduce((sum, r) => sum + r.points_awarded, 0)
  const correctCount = rows.filter((r) => r.points_awarded > 0).length

  return (
    <div>
      <div className="history-summary">
        <span className="history-stat">{correctCount}/{rows.length} correct</span>
        <span className="history-stat w">+{totalPoints} pts total</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Your pick</th>
              <th className="num">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const f = row.fixtures
              const won = row.points_awarded > 0
              const dateStr = new Date(f.kickoff_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })
              const pickLabel =
                row.predicted_result === 'home'
                  ? `${flagFor(f.home_team)} ${shortNameFor(f.home_team)}`
                  : row.predicted_result === 'away'
                    ? `${flagFor(f.away_team)} ${shortNameFor(f.away_team)}`
                    : 'Draw'

              return (
                <tr key={i}>
                  <td>
                    <div className="history-match">
                      <span className="history-teams">
                        {flagFor(f.home_team)} {shortNameFor(f.home_team)}{' '}
                        <span className="history-score">{f.home_score}–{f.away_score}</span>{' '}
                        {shortNameFor(f.away_team)} {flagFor(f.away_team)}
                      </span>
                      <span className="history-date">{dateStr}</span>
                    </div>
                  </td>
                  <td>{pickLabel}</td>
                  <td className="num">
                    <span className={won ? 'w' : 'l'}>{won ? `+${row.points_awarded}` : '0'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
