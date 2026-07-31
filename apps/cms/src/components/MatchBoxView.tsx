import {
  type MatchBoxScore,
  type TeamBoxScore,
  fmtMadeAtt,
  fmtReb,
} from "@sp/rules-engine";

function TeamTable({ team, tone }: { team: TeamBoxScore; tone: "home" | "away" }) {
  return (
    <div className={`match-box-team tone-${tone}`}>
      <div className="match-box-team-head">
        <span className="match-box-code">{team.code}</span>
        <h3>{team.name}</h3>
        <strong className="match-box-team-pts">{team.teamTotals.pts}</strong>
      </div>
      <div className="table-scroll">
        <table className="data-table wrap-cells sticky-name mobile-priority match-box-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ผู้เล่น</th>
              <th>2PT</th>
              <th>3PT</th>
              <th>FT</th>
              <th>REB</th>
              <th className="hide-sm">AST</th>
              <th className="hide-sm">ST</th>
              <th className="hide-sm">BLK</th>
              <th className="hide-sm">TO</th>
              <th className="hide-sm">PF</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p) => (
              <tr key={p.playerId ?? `${p.no}-${p.name}`}>
                <td className="num">{p.no}</td>
                <td className="player-name">{p.name}</td>
                <td>{fmtMadeAtt(p.fg2)}</td>
                <td>{fmtMadeAtt(p.fg3)}</td>
                <td>{fmtMadeAtt(p.ft)}</td>
                <td>{fmtReb(p.reb)}</td>
                <td className="hide-sm">{p.ast}</td>
                <td className="hide-sm">{p.st}</td>
                <td className="hide-sm">{p.blk}</td>
                <td className="hide-sm">{p.to}</td>
                <td className="hide-sm">{p.pf}</td>
                <td className="pts">
                  <strong>{p.pts}</strong>
                </td>
              </tr>
            ))}
            {team.players.length === 0 && (
              <tr>
                <td colSpan={12} className="muted">
                  ยังไม่มีสถิติผู้เล่นฝั่งนี้
                </td>
              </tr>
            )}
            <tr className="totals-row">
              <td />
              <td>
                <strong>รวมทีม</strong>
              </td>
              <td>{fmtMadeAtt(team.teamTotals.fg2)}</td>
              <td>{fmtMadeAtt(team.teamTotals.fg3)}</td>
              <td>{fmtMadeAtt(team.teamTotals.ft)}</td>
              <td>{fmtReb(team.teamTotals.reb)}</td>
              <td className="hide-sm">{team.teamTotals.ast}</td>
              <td className="hide-sm">{team.teamTotals.st}</td>
              <td className="hide-sm">{team.teamTotals.blk}</td>
              <td className="hide-sm">{team.teamTotals.to}</td>
              <td className="hide-sm">{team.teamTotals.pf}</td>
              <td className="pts">
                <strong>{team.teamTotals.pts}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MatchBoxView({ box }: { box: MatchBoxScore }) {
  const { meta, byQuarter, advanced } = box;
  return (
    <div className="match-box-view">
      <header className="match-box-scoreboard">
        {meta.tournament && (
          <p className="match-box-tournament">{meta.tournament}</p>
        )}
        <div className="match-box-score-row">
          <div className="match-box-side home">
            <span className="match-box-code">{meta.homeCode}</span>
            <span className="match-box-side-name">{meta.homeName}</span>
          </div>
          <div className="match-box-final" aria-label="สกอร์สุดท้าย">
            <span>{meta.finalHome}</span>
            <span className="match-box-dash">–</span>
            <span>{meta.finalAway}</span>
          </div>
          <div className="match-box-side away">
            <span className="match-box-code">{meta.awayCode}</span>
            <span className="match-box-side-name">{meta.awayName}</span>
          </div>
        </div>
        <p className="match-box-meta muted">
          {[
            meta.date,
            meta.tipOff ? `เริ่ม ${meta.tipOff}` : null,
            meta.venue,
            meta.gameNo ? `Game ${meta.gameNo}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {byQuarter.length > 0 && (
        <div className="quarter-strip" role="table" aria-label="สกอร์รายควอเตอร์">
          <div className="quarter-strip-head" role="row">
            <span role="columnheader">ทีม</span>
            {byQuarter.map((q) => (
              <span key={q.period} role="columnheader">
                Q{q.period}
              </span>
            ))}
            <span role="columnheader">รวม</span>
          </div>
          <div className="quarter-strip-row" role="row">
            <span className="match-box-code" role="cell">
              {meta.homeCode}
            </span>
            {byQuarter.map((q) => (
              <span key={`h-${q.period}`} role="cell" title={`สะสม ${q.homeCum}`}>
                {q.home}
              </span>
            ))}
            <strong role="cell">{meta.finalHome}</strong>
          </div>
          <div className="quarter-strip-row" role="row">
            <span className="match-box-code" role="cell">
              {meta.awayCode}
            </span>
            {byQuarter.map((q) => (
              <span key={`a-${q.period}`} role="cell" title={`สะสม ${q.awayCum}`}>
                {q.away}
              </span>
            ))}
            <strong role="cell">{meta.finalAway}</strong>
          </div>
        </div>
      )}

      <TeamTable team={box.home} tone="home" />
      <TeamTable team={box.away} tone="away" />

      {advanced && (
        <div className="match-box-advanced">
          <h3>สถิติเปรียบเทียบ</h3>
          <div className="adv-grid">
            {(
              [
                ["จากเทิร์นโอเวอร์", advanced.pointsFromTurnovers],
                ["ในเพนต์", advanced.pointsInThePaint],
                ["โอกาสสอง", advanced.secondChancePoints],
                ["ฟาสต์เบรก", advanced.fastBreakPoints],
                ["จากม้านั่ง", advanced.benchPoints],
                ["นำมากสุด", advanced.biggestLead],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label} className="adv-card">
                  <span className="stat-label">{label}</span>
                  <div className="adv-values">
                    <span>
                      <small>{meta.homeCode}</small> {v!.home}
                    </span>
                    <span>
                      <small>{meta.awayCode}</small> {v!.away}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
