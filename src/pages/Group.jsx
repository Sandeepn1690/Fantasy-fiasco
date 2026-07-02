import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import Predictions from '../components/Predictions.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import History from '../components/History.jsx'

export default function Group() {
  const { id } = useParams()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('predictions')

  useEffect(() => {
    supabase
      .from('groups')
      .select('id, name, invite_code')
      .eq('id', id)
      .single()
      .then(({ data }) => setGroup(data))
  }, [id])

  return (
    <div className="group-page">
      <div className="page-head">
        <h2>{group?.name ?? 'Loading…'}</h2>
        {group && (
          <p>
            Invite code: <span className="badge">{group.invite_code}</span>
          </p>
        )}
      </div>

      <div className="tabs">
        <button className={tab === 'predictions' ? 'tab active' : 'tab'} onClick={() => setTab('predictions')}>
          Predictions
        </button>
        <button className={tab === 'leaderboard' ? 'tab active' : 'tab'} onClick={() => setTab('leaderboard')}>
          Leaderboard
        </button>
        <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
          My Results
        </button>
      </div>

      {tab === 'predictions' && <Predictions groupId={id} />}
      {tab === 'leaderboard' && <Leaderboard groupId={id} />}
      {tab === 'history' && <History />}
    </div>
  )
}
