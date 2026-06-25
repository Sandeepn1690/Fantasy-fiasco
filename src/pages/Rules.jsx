import { RULES } from '../data/league.js'

export default function Rules() {
  return (
    <>
      <div className="page-head">
        <h2>League Rules</h2>
        <p>Read them. Ignorance is not a valid trade veto.</p>
      </div>

      <ol className="rules-list">
        {RULES.map((r, i) => (
          <li key={i}>
            <strong>{r.title}</strong>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
