import {
  type MatchBoxScore,
  type TeamBoxScore,
  fmtMadeAtt,
  fmtPlusMinus,
  fmtShotPct,
} from "@sp/rules-engine";

function shotPair(madeAtt: { made: number; att: number }) {
  return (
    <>
      <td className="num">{fmtMadeAtt(madeAtt)}</td>
      <td className="num muted-pct">{fmtShotPct(madeAtt)}</td>
    </>
  );
}

function TeamTable({ team, tone }: { team: TeamBoxScore; tone: "home" | "away" }) {
  return (
    <div className={`match-box-team tone-${tone}`}>
      <div className="match-box-team-head">
        <span className="match-box-code">{team.code}</span>
        <div className="match-box-team-title">
          <h3>{team.name}</h3>
          {team.coach ? (
            <p className="muted match-box-coach">Coach: {team.coach}</p>
          ) : null}
        </div>
        <strong className="match-box-team-pts" title="คะแนนรวมทีม">
          {team.teamTotals.pts}
        </strong>
      </div>
      <p className="match-box-scroll-hint muted">เลื่อนซ้าย–ขวาเพื่อดูคอลัมน์ครบ</p>
      <div className="table-scroll">
        <table className="data-table sticky-name match-box-table fiba-table">
          <thead>
            <tr>
              <th rowSpan={2}>No</th>
              <th rowSpan={2}>Name</th>
              <th rowSpan={2}>Min</th>
              <th colSpan={2}>Field Goals</th>
              <th colSpan={2}>2 Points</th>
              <th colSpan={2}>3 Points</th>
              <th colSpan={2}>Free Throws</th>
              <th colSpan={3}>Rebounds</th>
              <th rowSpan={2}>AS</th>
              <th rowSpan={2}>TO</th>
              <th rowSpan={2}>ST</th>
              <th rowSpan={2}>BS</th>
              <th colSpan={2}>Fouls</th>
              <th rowSpan={2}>+/-</th>
              <th rowSpan={2}>EF</th>
              <th rowSpan={2}>PTS</th>
            </tr>
            <tr className="fiba-subhead">
              <th>M/A</th>
              <th>%</th>
              <th>M/A</th>
              <th>%</th>
              <th>M/A</th>
              <th>%</th>
              <th>M/A</th>
              <th>%</th>
              <th>OR</th>
              <th>DR</th>
              <th>TOT</th>
              <th>PF</th>
              <th>FD</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p) => (
              <tr key={p.playerId ?? `${p.no}-${p.name}`}>
                <td className="num">{p.no}</td>
                <td className="player-name">{p.name}</td>
                <td className="num muted-pct">{p.min ?? "—"}</td>
                {shotPair(p.fg)}
                {shotPair(p.fg2)}
                {shotPair(p.fg3)}
                {shotPair(p.ft)}
                <td className="num">{p.reb.off}</td>
                <td className="num">{p.reb.def}</td>
                <td className="num">{p.reb.tot}</td>
                <td className="num">{p.ast}</td>
                <td className="num">{p.to}</td>
                <td className="num">{p.st}</td>
                <td className="num">{p.blk}</td>
                <td className="num">{p.pf}</td>
                <td className="num">{p.fd}</td>
                <td className="num">{fmtPlusMinus(p.plusMinus)}</td>
                <td className="num">{p.ef}</td>
                <td className="pts num">
                  <strong>{p.pts}</strong>
                </td>
              </tr>
            ))}
            {team.players.length === 0 && (
              <tr>
                <td colSpan={23} className="muted">
                  ยังไม่มีสถิติฝั่งนี้ — บันทึกใน Courtside แล้วซิงก์ก่อน
                </td>
              </tr>
            )}
            <tr className="totals-row">
              <td />
              <td>
                <strong>Totals</strong>
              </td>
              <td className="muted-pct">—</td>
              {shotPair(team.teamTotals.fg)}
              {shotPair(team.teamTotals.fg2)}
              {shotPair(team.teamTotals.fg3)}
              {shotPair(team.teamTotals.ft)}
              <td className="num">{team.teamTotals.reb.off}</td>
              <td className="num">{team.teamTotals.reb.def}</td>
              <td className="num">{team.teamTotals.reb.tot}</td>
              <td className="num">{team.teamTotals.ast}</td>
              <td className="num">{team.teamTotals.to}</td>
              <td className="num">{team.teamTotals.st}</td>
              <td className="num">{team.teamTotals.blk}</td>
              <td className="num">{team.teamTotals.pf}</td>
              <td className="num">{team.teamTotals.fd}</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
              <td className="pts num">
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
  const compareRows = (
    [
      ["Points from Turnovers", advanced?.pointsFromTurnovers],
      ["Points in the Paint", advanced?.pointsInThePaint],
      ["Second Chance Points", advanced?.secondChancePoints],
      ["Fast Break Points", advanced?.fastBreakPoints],
      ["Bench Points", advanced?.benchPoints],
      ["Biggest Lead", advanced?.biggestLead],
    ] as const
  ).filter(([, v]) => v);
  const quarterParen =
    byQuarter.length > 0
      ? `(${byQuarter.map((q) => `${q.home}-${q.away}`).join(", ")})`
      : null;

  return (
    <div className="match-box-view">
      <header className="match-box-scoreboard">
        <div className="match-box-brand">
          <img src="/sp-logo.png" alt="SP FITNESS" className="match-box-logo" />
          <div>
            <span className="match-box-brand-title">FIBA Box Score</span>
            <p className="match-box-brand-sub muted">SP FITNESS · สองทีม</p>
          </div>
        </div>
        {meta.tournament && (
          <p className="match-box-tournament">{meta.tournament}</p>
        )}
        <div className="match-box-score-row">
          <div className="match-box-side home">
            <span className="match-box-code">{meta.homeCode}</span>
            <span className="match-box-side-name">{meta.homeName}</span>
            {meta.homeCoach && (
              <span className="muted match-box-coach">Coach: {meta.homeCoach}</span>
            )}
          </div>
          <div className="match-box-final" aria-label="สกอร์สุดท้าย">
            <span>{meta.finalHome}</span>
            <span className="match-box-dash">–</span>
            <span>{meta.finalAway}</span>
          </div>
          <div className="match-box-side away">
            <span className="match-box-code">{meta.awayCode}</span>
            <span className="match-box-side-name">{meta.awayName}</span>
            {meta.awayCoach && (
              <span className="muted match-box-coach">Coach: {meta.awayCoach}</span>
            )}
          </div>
        </div>
        {quarterParen && (
          <p className="match-box-quarters muted">{quarterParen}</p>
        )}
      </header>

      <div className="match-box-body">
        <section className="match-info-card" aria-label="Match Information">
          <h3>Match Information</h3>
          <dl className="match-info-grid">
            <div>
              <dt>Tournament</dt>
              <dd>{meta.tournament ?? "—"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {[meta.date, meta.tipOff ? `Start time: ${meta.tipOff}` : null]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{meta.venue ?? "—"}</dd>
            </div>
            <div>
              <dt>Game No.</dt>
              <dd>{meta.gameNo ?? "—"}</dd>
            </div>
            <div className="span-2">
              <dt>Matchup</dt>
              <dd>
                {meta.homeName} ({meta.homeCode}) vs {meta.awayName} ({meta.awayCode})
              </dd>
            </div>
            <div className="span-2">
              <dt>Final Score</dt>
              <dd>
                {meta.homeCode} {meta.finalHome} – {meta.finalAway}{" "}
                {meta.awayCode}
              </dd>
            </div>
            {(meta.crewChief || meta.umpire) && (
              <div className="span-2">
                <dt>Officials</dt>
                <dd>
                  {[
                    meta.crewChief ? `Crew Chief: ${meta.crewChief}` : null,
                    meta.umpire ? `Umpire(s): ${meta.umpire}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {byQuarter.length > 0 && (
          <div
            className="quarter-strip"
            role="table"
            aria-label="สกอร์รายควอเตอร์"
          >
            <p className="quarter-strip-title">Scoring by Period</p>
            <div className="quarter-strip-head" role="row">
              <span role="columnheader">Team</span>
              {byQuarter.map((q) => (
                <span key={q.period} role="columnheader">
                  Q{q.period}
                </span>
              ))}
              <span role="columnheader">Final</span>
            </div>
            <div className="quarter-strip-row" role="row">
              <span className="match-box-code" role="cell">
                {meta.homeCode}
              </span>
              {byQuarter.map((q) => (
                <span
                  key={`h-${q.period}`}
                  role="cell"
                  title={`สะสม ${q.homeCum}`}
                >
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
                <span
                  key={`a-${q.period}`}
                  role="cell"
                  title={`สะสม ${q.awayCum}`}
                >
                  {q.away}
                </span>
              ))}
              <strong role="cell">{meta.finalAway}</strong>
            </div>
          </div>
        )}

        <TeamTable team={box.home} tone="home" />
        <TeamTable team={box.away} tone="away" />

        {compareRows.length > 0 && (
          <div className="match-box-advanced">
            <h3>Team Comparison</h3>
            <table className="adv-compare-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>{meta.homeCode}</th>
                  <th>{meta.awayCode}</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([label, v]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{v!.home}</td>
                    <td>{v!.away}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="match-box-legend">
        <strong>Legend</strong>
        <p>
          No · Min · M/A Made/Attempts · % · OR/DR/TOT Rebounds · AS Assists · TO
          Turnovers · ST Steals · BS Blocks · PF Personal Fouls · FD Fouls Drawn ·
          +/- · EF Efficiency · PTS Points
        </p>
      </footer>
    </div>
  );
}
