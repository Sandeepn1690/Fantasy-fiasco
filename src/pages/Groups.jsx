import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Groups() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('groups(id, name, invite_code)')
      .eq('user_id', user.id)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setGroups(data.map((row) => row.groups))
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data, error: createError } = await supabase
        .from('groups')
        .insert({ name: newGroupName, owner_id: user.id })
        .select()
        .single()
      if (createError) throw createError
      navigate(`/groups/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data, error: joinError } = await supabase.rpc('join_group_by_code', {
        p_invite_code: inviteCode.trim(),
      })
      if (joinError) throw joinError
      navigate(`/groups/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="groups-page">
      <div className="page-head">
        <h2>Your groups</h2>
        <p>Predict matches with friends in private groups.</p>
      </div>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="empty-state">You're not in any groups yet — create one or join with an invite code.</p>
      ) : (
        <div className="cards">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="card group-card">
              <h3>{g.name}</h3>
              <p>
                Invite code: <span className="badge">{g.invite_code}</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="group-forms">
        <form className="post-form" onSubmit={handleCreate}>
          <h3>Create a group</h3>
          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            Create group
          </button>
        </form>

        <form className="post-form" onSubmit={handleJoin}>
          <h3>Join a group</h3>
          <input
            type="text"
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            Join group
          </button>
        </form>
      </div>
    </div>
  )
}
