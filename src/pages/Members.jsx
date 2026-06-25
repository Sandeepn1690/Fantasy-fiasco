import { TEAMS } from '../data/league.js'

export default function Members() {
  return (
    <>
      <div className="page-head">
        <h2>Teams</h2>
        <p>The {TEAMS.length} brave souls of the league.</p>
      </div>

      <div className="member-grid">
        {TEAMS.map((t) => (
          <div className="member" key={t.id}>
            <div className="avatar" style={{ background: t.color }}>
              {t.team.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="team">{t.team}</div>
              <div className="owner">{t.owner} · {t.w}–{t.l}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
