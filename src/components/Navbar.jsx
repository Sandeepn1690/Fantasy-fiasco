import { NavLink, useNavigate } from 'react-router-dom'
import { APP_NAME } from '../lib/constants.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="logo">FF</span>
          {APP_NAME}
        </NavLink>
        <nav className="nav-links">
          {user && (
            <NavLink to="/groups" end>
              Groups
            </NavLink>
          )}
        </nav>
        {user ? (
          <button className="btn btn-ghost" onClick={handleSignOut}>
            Sign out
          </button>
        ) : (
          <NavLink to="/login" className="btn btn-ghost">
            Sign in
          </NavLink>
        )}
      </div>
    </header>
  )
}
