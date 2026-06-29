import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { flagFor } from '../lib/flags.js'

const OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'draw', label: 'Draw' },
  { value: 'away', label: 'Away' },
]

const OPTION_LABEL = { home: 'Home', draw: 'Draw', away: 'Away' }

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

  const dateKey = (iso) => new Date(iso).toDateString()
  const todayKey = new Date().toDateString()

  let relevantFixtures = fixtures.filter((f) => dateKey(f.kickoff_at) === todayKey)
  let dayLabel = "Today's matches"

  if (relevantFixtures.length === 0) {
    const upcoming = fixtures.filter((f) => new Date(f.kickoff_at) > new Date())
    if (upcoming.length > 0) {
      const nextKey = dateKey(upcoming[0].kickoff_at)
      relevantFixtures = upcoming.filter((f) => dateKey(f.kickoff_at) === nextKey)
      dayLabel = `No matches today — next up: ${new Date(upcoming[0].kickoff_at).toLocaleDateString()}`
    } else {
      dayLabel = 'No upcoming matches'
    }
  }

  return (
    <div className="predictions">
      <p className="day-label">{dayLabel}</p>
      <p className="streak-banner">🔥 Current streak: {streak} correct in a row</p>
      {error && <p className="form-error">{error}</p>}
      <div className="fixture-list">
        {relevantFixtures.map((f) => {
          const locked = new Date(f.kickoff_at) <= new Date()
          const isFinished = f.status === 'finished'
          const mine = predictions[f.id]

          return (
            <div key={f.id} className="fixture-card">
              <div className="fixture-teams">
                <span className={f.result === 'home' ? 'team winner' : 'team'}>
                  <span className="flag">{flagFor(f.home_team)}</span> {f.home_team}
                </span>
                {isFinished ? (
                  <span className="score">
                    {f.home_score} – {f.away_score}
                  </span>
                ) : (
                  <span className="vs">vs</span>
                )}
                <span className={f.result === 'away' ? 'team winner' : 'team'}>
                  {f.away_team} <span className="flag">{flagFor(f.away_team)}</span>
                </span>
              </div>
              <div className="fixture-meta">
                {new Date(f.kickoff_at).toLocaleString()} · {isFinished ? 'Final' : f.status}
              </div>

              {locked ? (
                mine ? (
                  <p className={mine.points_awarded ? 'points-result' : 'points-result muted'}>
                    Your pick: {OPTION_LABEL[mine.predicted_result]}
                    {mine.points_awarded != null && ` · +${mine.points_awarded} pts`}
                  </p>
                ) : (
                  <p className="points-result muted">No pick submitted</p>
                )
              ) : (
                <div className="pick-row">
                  {OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={mine?.predicted_result === opt.value ? 'pick active' : 'pick'}
                      disabled={savingId === f.id}
                      onClick={() => pick(f.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
