import { NavLink } from 'react-router-dom'
import { LEAGUE } from '../data/league.js'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/standings', label: 'Standings' },
  { to: '/members', label: 'Teams' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/rules', label: 'Rules' },
  { to: '/trash-talk', label: 'Trash Talk' },
]

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="logo">FF</span>
          {LEAGUE.name}
        </NavLink>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
