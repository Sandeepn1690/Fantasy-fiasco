import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="notfound">
      <h2>404</h2>
      <p>This play doesn’t exist. Maybe it got benched.</p>
      <Link to="/" className="btn btn-primary">Back to Home</Link>
    </div>
  )
}
