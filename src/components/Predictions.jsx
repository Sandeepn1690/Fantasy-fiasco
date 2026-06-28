import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'draw', label: 'Draw' },
  { value: 'away', label: 'Away' },
]

export default function Predictions() {
  const { user } = useAuth()
  const [fixtures, setFixtures] = useState([])
  const [predictions, setPredictions] = useState({})
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: fixtureRows }, { data: predictionRows }, { data: profile }] = await Promise.all([
      supabase.from('fixtures').select('*').order('kickoff_at', { ascending: true }),
      supabase.from('predictions').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('current_streak').eq('id', user.id).single(),
    ])
    setFixtures(fixtureRows ?? [])
    const byFixture = {}
    for (const p of predictionRows ?? []) byFixture[p.fixture_id] = p
    setPredictions(byFixture)
    setStreak(profile?.current_streak ?? 0)
    setLoading(false)
  }

  async function pick(fixtureId, predictedResult) {
    setError(null)
    setSavingId(fixtureId)
    const { data, error: saveError } = await supabase
      .from('predictions')
      .upsert(
        { user_id: user.id, fixture_id: fixtureId, predicted_result: predictedResult },
        { onConflict: 'user_id,fixture_id' }
      )
      .select()
      .single()
    if (saveError) {
      setError(saveError.message)
    } else {
      setPredictions((prev) => ({ ...prev, [fixtureId]: data }))
    }
    setSavingId(null)
  }

  if (loading) return <p className="loading">Loading fixtures…</p>
  if (fixtures.length === 0) return <p className="empty-state">No fixtures yet — check back once matches are scheduled.</p>

  return (
    <div className="predictions">
      <p className="streak-banner">🔥 Current streak: {streak} correct in a row</p>
      {error && <p className="form-error">{error}</p>}
      <div className="fixture-list">
        {fixtures.map((f) => {
          const locked = new Date(f.kickoff_at) <= new Date()
          const mine = predictions[f.id]
          return (
            <div key={f.id} className="fixture-card">
              <div className="fixture-teams">
                <span>{f.home_team}</span>
                <span className="vs">vs</span>
                <span>{f.away_team}</span>
              </div>
              <div className="fixture-meta">
                {new Date(f.kickoff_at).toLocaleString()} ·{' '}
                {f.status === 'finished' ? `Final: ${f.home_score}–${f.away_score}` : f.status}
              </div>
              <div className="pick-row">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={mine?.predicted_result === opt.value ? 'pick active' : 'pick'}
                    disabled={locked || savingId === f.id}
                    onClick={() => pick(f.id, opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {locked && mine?.points_awarded != null && (
                <p className="points-result">+{mine.points_awarded} pts</p>
              )}
              {locked && !mine && <p className="points-result muted">No pick submitted</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
