import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { suggestUsernames } from '../lib/usernameSuggestions.js'

export default function Profile() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [suggestions, setSuggestions] = useState(suggestUsernames())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    setCurrentUsername(data?.username ?? '')
    setUsername(data?.username ?? '')
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id)
    if (updateError) {
      setError(
        updateError.code === '23505' ? 'That username is already taken — try another.' : updateError.message
      )
    } else {
      setCurrentUsername(username)
      setSuccess(true)
    }
    setSaving(false)
  }

  if (loading) return <p className="loading">Loading…</p>

  return (
    <div className="auth-page">
      <div className="page-head">
        <h2>Your profile</h2>
        <p>Currently playing as <strong>{currentUsername}</strong>.</p>
      </div>

      <form className="post-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          required
        />

        <div className="suggestion-row">
          {suggestions.map((s) => (
            <button key={s} type="button" className="suggestion-chip" onClick={() => setUsername(s)}>
              {s}
            </button>
          ))}
          <button
            type="button"
            className="suggestion-chip suggestion-refresh"
            onClick={() => setSuggestions(suggestUsernames())}
          >
            🎲 More ideas
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="points-result">Username updated!</p>}

        <button className="btn btn-primary" type="submit" disabled={saving || username === currentUsername}>
          {saving ? 'Saving…' : 'Save username'}
        </button>
      </form>
    </div>
  )
}
