import { Link } from 'react-router-dom'
import { LEAGUE, TEAMS } from '../data/league.js'

export default function Home() {
  const leader = [...TEAMS].sort((a, b) => b.w - a.w || b.pf - a.pf)[0]

  return (
    <>
      <section className="hero">
        <h1>
          Welcome to <span className="accent">{LEAGUE.name}</span>
        </h1>
        <p>{LEAGUE.tagline}</p>
        <div className="cta-row">
          <Link to="/standings" className="btn btn-primary">View Standings</Link>
          <Link to="/trash-talk" className="btn btn-ghost">Talk Some Trash</Link>
        </div>
      </section>

      <div className="cards">
        <div className="card">
          <div className="icon">👑</div>
          <h3>Current Leader</h3>
          <p>{leader.team} ({leader.owner}) at {leader.w}–{leader.l}.</p>
        </div>
        <div className="card">
          <div className="icon">🏈</div>
          <h3>{TEAMS.length} Teams</h3>
          <p>One trophy. One last-place pizza bill. No mercy.</p>
        </div>
        <div className="card">
          <div className="icon">📅</div>
          <h3>{LEAGUE.season} Season</h3>
          <p>Regular season winding down — playoff race is heating up.</p>
        </div>
        <div className="card">
          <div className="icon">🔥</div>
          <h3>Trash Talk Central</h3>
          <p>The most active part of the league. Bring receipts.</p>
        </div>
      </div>
    </>
  )
}
