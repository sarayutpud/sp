import {
  type MatchBoxScore,
  type TeamBoxScore,
  fmtMadeAtt,
  fmtPlusMinus,
  fmtReb,
  fmtShotPct,
} from "@sp/rules-engine";

function shotCell(madeAtt: { made: number; att: number }) {
  const pct = fmtShotPct(madeAtt);
  return (
    <td className="shot-cell">
      <span>{fmtMadeAtt(madeAtt)}</span>
      {pct !== "—" && <small className="shot-pct">{pct}%</small>}
    </td>
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
            <p className="muted match-box-coach">โค้ช: {team.coach}</p>
          ) : null}
        </div>
        <strong className="match-box-team-pts" title="คะแนนรวมทีม">
          {team.teamTotals.pts}
        </strong>
      </div>
      <p className="match-box-scroll-hint muted">เลื่อนซ้าย–ขวาเพื่อดูคอลัมน์ครบ</p>
      <div className="table-scroll">
        <table className="data-table wrap-cells sticky-name match-box-table">
          <thead>
            <tr>
              <th title="เบอร์">#</th>
              <th>ชื่อ</th>
              <th title="Field Goals Made/Attempted">FG</th>
              <th title="2 Points">2PT</th>
              <th title="3 Points">3PT</th>
              <th title="Free Throws">FT</th>
              <th title="รีบาวด์ รุก/รับ (OR/DR)">REB</th>
              <th title="Assists">AS</th>
              <th title="Turnovers">TO</th>
              <th title="Steals">ST</th>
              <th title="Blocks">BS</th>
              <th title="Personal Fouls">PF</th>
              <th title="Fouls Drawn">FD</th>
              <th title="Plus/Minus">+/-</th>
              <th title="Efficiency">EF</th>
              <th title="Points">PTS</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p) => (
              <tr key={p.playerId ?? `${p.no}-${p.name}`}>
                <td className="num">{p.no}</td>
                <td className="player-name">{p.name}</td>
                {shotCell(p.fg)}
                {shotCell(p.fg2)}
                {shotCell(p.fg3)}
                {shotCell(p.ft)}
                <td title={`OR ${p.reb.off} · DR ${p.reb.def} · TOT ${p.reb.tot}`}>
                  {fmtReb(p.reb)}
                </td>
                <td>{p.ast}</td>
                <td>{p.to}</td>
                <td>{p.st}</td>
                <td>{p.blk}</td>
                <td>{p.pf}</td>
                <td>{p.fd}</td>
                <td>{fmtPlusMinus(p.plusMinus)}</td>
                <td>{p.ef}</td>
                <td className="pts">
                  <strong>{p.pts}</strong>
                </td>
              </tr>
            ))}
            {team.players.length === 0 && (
              <tr>
                <td colSpan={16} className="muted">
                  ยังไม่มีสถิติฝั่งนี้ — บันทึกใน Courtside แล้วซิงก์ก่อน
                </td>
              </tr>
            )}
            <tr className="totals-row">
              <td />
              <td>
                <strong>รวมทีม</strong>
              </td>
              {shotCell(team.teamTotals.fg)}
              {shotCell(team.teamTotals.fg2)}
              {shotCell(team.teamTotals.fg3)}
              {shotCell(team.teamTotals.ft)}
              <td>{fmtReb(team.teamTotals.reb)}</td>
              <td>{team.teamTotals.ast}</td>
              <td>{team.teamTotals.to}</td>
              <td>{team.teamTotals.st}</td>
              <td>{team.teamTotals.blk}</td>
              <td>{team.teamTotals.pf}</td>
              <td>{team.teamTotals.fd}</td>
              <td className="muted">—</td>
              <td className="muted">—</td>
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
  const hasAdvanced =
    advanced &&
    Object.values(advanced).some((v) => v != null);

  return (
    <div className="match-box-view">
      <header className="match-box-scoreboard">
        <div className="match-box-brand">
          <img src="/sp-logo.png" alt="SP FITNESS" className="match-box-logo" />
          <div>
            <span className="match-box-brand-title">FIBA Box Score</span>
            <p className="match-box-brand-sub muted">ใบสถิตินัด · สองทีม</p>
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
              <span className="muted match-box-coach">โค้ช: {meta.homeCoach}</span>
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
              <span className="muted match-box-coach">โค้ช: {meta.awayCoach}</span>
            )}
          </div>
        </div>
        <p className="match-box-meta muted">
          {[
            meta.date,
            meta.tipOff ? `เริ่ม ${meta.tipOff}` : null,
            meta.venue,
            meta.gameNo ? `เกม ${meta.gameNo}` : null,
            meta.crewChief ? `Crew Chief: ${meta.crewChief}` : null,
            meta.umpire ? `Umpire: ${meta.umpire}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {byQuarter.length > 0 && (
        <div className="quarter-strip" role="table" aria-label="สกอร์รายควอเตอร์">
          <p className="quarter-strip-title">สกอร์รายควอเตอร์</p>
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

      <p className="match-box-section-label">ตารางผู้เล่น · ทีมเหย้า</p>
      <TeamTable team={box.home} tone="home" />
      <p className="match-box-section-label">ตารางผู้เล่น · ทีมเยือน</p>
      <TeamTable team={box.away} tone="away" />

      {hasAdvanced && (
        <div className="match-box-advanced">
          <h3>สถิติเปรียบเทียบทีม</h3>
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

      <footer className="match-box-legend">
        <strong>คำอธิบายคอลัมน์</strong>
        <p>
          FG/2PT/3PT/FT = เข้า/พยายาม (และ %) · REB = รุก/รับ · AS แอสซิสต์ · TO
          เทิร์นโอเวอร์ · ST สตีล · BS บล็อก · PF ฟาล์ว · FD ถูกฟาล์ว · +/- คะแนนตอนอยู่สนาม ·
          EF ประสิทธิภาพ · PTS คะแนน · นาทีเล่น (Min) ยังไม่บันทึกในระบบ
        </p>
        <p className="muted">
          ต้องการใบใกล้ฟอร์มพิมพ์มากที่สุด → กดส่งออก <strong>Excel</strong>
        </p>
      </footer>
    </div>
  );
}
