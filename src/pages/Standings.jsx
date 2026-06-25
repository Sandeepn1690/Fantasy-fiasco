import { TEAMS } from '../data/league.js'

export default function Standings() {
  const ranked = [...TEAMS].sort((a, b) => b.w - a.w || b.pf - a.pf)

  return (
    <>
      <div className="page-head">
        <h2>Standings</h2>
        <p>Ranked by record, then points for. Top 4 make the playoffs.</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Owner</th>
              <th className="num">W</th>
              <th className="num">L</th>
              <th className="num">PF</th>
              <th className="num">PA</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((t, i) => (
              <tr key={t.id}>
                <td className="rank">{i + 1}{i < 4 && <span className="badge" style={{ marginLeft: 8 }}>PO</span>}</td>
                <td>{t.team}</td>
                <td>{t.owner}</td>
                <td className="num w">{t.w}</td>
                <td className="num l">{t.l}</td>
                <td className="num">{t.pf.toFixed(1)}</td>
                <td className="num">{t.pa.toFixed(1)}</td>
                <td className={t.streak.startsWith('W') ? 'w' : 'l'}>{t.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
