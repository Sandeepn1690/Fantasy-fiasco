import { APP_NAME } from '../lib/constants.js'

export default function Footer() {
  return (
    <footer className="footer">
      {APP_NAME} · World Cup Predictions · Built with React + Vite + Supabase
    </footer>
  )
}
