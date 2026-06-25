import { LEAGUE } from '../data/league.js'

export default function Footer() {
  return (
    <footer className="footer">
      {LEAGUE.name} · {LEAGUE.season} Season · Built with React + Vite
    </footer>
  )
}
