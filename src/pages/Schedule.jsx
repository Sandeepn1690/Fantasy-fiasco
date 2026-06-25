import { SCHEDULE } from '../data/league.js'

export default function Schedule() {
  return (
    <>
      <div className="page-head">
        <h2>Schedule</h2>
        <p>Upcoming matchups and the road to the championship.</p>
      </div>

      {SCHEDULE.map((wk) => (
        <div className="week" key={wk.week}>
          <h4>{wk.week}</h4>
          {wk.games.map((g, i) => (
            <div className="matchup" key={i}>
              <span>{g.away}</span>
              <span className="vs">@</span>
              <span>{g.home}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
