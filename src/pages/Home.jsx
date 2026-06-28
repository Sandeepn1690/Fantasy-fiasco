import { Link } from 'react-router-dom'
import { APP_NAME, APP_TAGLINE } from '../lib/constants.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <section className="hero">
        <h1>
          Welcome to <span className="accent">{APP_NAME}</span>
        </h1>
        <p>{APP_TAGLINE}</p>
        <div className="cta-row">
          {user ? (
            <Link to="/groups" className="btn btn-primary">
              Go to my groups
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="cards">
        <div className="card">
          <div className="icon">🔮</div>
          <h3>Predict every match</h3>
          <p>Call home, away, or draw before kickoff — no edits once it starts.</p>
        </div>
        <div className="card">
          <div className="icon">👥</div>
          <h3>Private groups</h3>
          <p>Create a group, share the invite code, compete with friends only.</p>
        </div>
        <div className="card">
          <div className="icon">🔥</div>
          <h3>Streak bonus</h3>
          <p>5 points per correct call, plus +10 every time you hit 3 in a row.</p>
        </div>
        <div className="card">
          <div className="icon">📡</div>
          <h3>Live leaderboard</h3>
          <p>Results sync in from the tournament and your group's board updates live.</p>
        </div>
      </div>
    </>
  )
}
