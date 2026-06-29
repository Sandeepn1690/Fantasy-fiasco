import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ groupId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`leaderboard-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  async function load() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('group_id', groupId)
      .order('total_points', { ascending: false })
    if (!error) setRows(data ?? [])
    setLoading(false)
  }

  if (loading) return <p className="loading">Loading leaderboard…</p>
  if (rows.length === 0) return <p className="empty-state">No members yet.</p>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.user_id}>
              <td className="rank">{MEDALS[i] ?? `#${i + 1}`}</td>
              <td>{row.username}</td>
              <td className="num">{row.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
