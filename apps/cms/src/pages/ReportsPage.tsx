import { ShotChartView } from "@sp/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchGames, fetchPbp, fetchPlayers, fetchTeams } from "../lib/api";
import {
  buildCoachInsights,
  buildCoachPlayerLines,
  buildPlayerZones,
  buildTeamTotals,
  buildTeamZones,
  fmtPct,
} from "../lib/coach-reports";
import {
  buildFullBoxScore,
  buildShotMarkers,
  buildTeamAdvanced,
  shotDistanceSplit,
  sumBoxLines,
} from "../lib/stats-reports";

type ReportTab = "insights" | "box" | "advanced" | "shotchart" | "zones";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "insights", label: "คำแนะนำโค้ช" },
  { id: "box", label: "สถิติพื้นฐาน" },
  { id: "advanced", label: "สถิติขั้นสูง" },
  { id: "shotchart", label: "แผนภาพการยิง" },
  { id: "zones", label: "โซนการยิง" },
];

function fmtRating(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

export function ReportsPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [tab, setTab] = useState<ReportTab>("insights");

  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const selectedGame = games.data?.find((g) => g.id === selectedGameId);

  const activeTeamId =
    teamFilter || selectedGame?.home_team_id || teams.data?.[0]?.id || "";

  const oppTeamId = selectedGame
    ? activeTeamId === selectedGame.home_team_id
      ? selectedGame.away_team_id
      : selectedGame.home_team_id
    : "";

  const pbp = useQuery({
    queryKey: ["pbp", selectedGameId],
    queryFn: () => fetchPbp(selectedGameId ?? ""),
    enabled: !!selectedGameId,
  });

  const allPlayers = useQuery({
    queryKey: ["players-all"],
    queryFn: () => fetchPlayers(),
    enabled: !!selectedGameId,
  });

  const playerLines = useMemo(() => {
    if (!pbp.data || !allPlayers.data) return [];
    return buildCoachPlayerLines(pbp.data, allPlayers.data, activeTeamId);
  }, [pbp.data, allPlayers.data, activeTeamId]);

  const fullBox = useMemo(() => {
    if (!pbp.data || !allPlayers.data) return [];
    return buildFullBoxScore(pbp.data, allPlayers.data, activeTeamId);
  }, [pbp.data, allPlayers.data, activeTeamId]);

  const boxTotals = useMemo(() => sumBoxLines(fullBox), [fullBox]);

  const advanced = useMemo(() => {
    if (!pbp.data || !activeTeamId || !oppTeamId) return null;
    return buildTeamAdvanced(pbp.data, activeTeamId, oppTeamId);
  }, [pbp.data, activeTeamId, oppTeamId]);

  const teamZones = useMemo(() => {
    if (!pbp.data) return [];
    return buildTeamZones(pbp.data, activeTeamId);
  }, [pbp.data, activeTeamId]);

  const zoneShades = useMemo(() => {
    const find = (zone: "paint" | "mid" | "three") =>
      teamZones.find((z) => z.zone === zone)?.pct ?? null;
    return { paint: find("paint"), mid: find("mid"), three: find("three") };
  }, [teamZones]);

  const shotMarkers = useMemo(() => {
    if (!pbp.data) return [];
    return buildShotMarkers(pbp.data, activeTeamId);
  }, [pbp.data, activeTeamId]);

  const distanceSplit = useMemo(() => {
    if (!pbp.data) return { near: 0, far: 0 };
    return shotDistanceSplit(pbp.data, activeTeamId);
  }, [pbp.data, activeTeamId]);

  const playerZones = useMemo(() => {
    if (!pbp.data || !allPlayers.data) return [];
    return buildPlayerZones(pbp.data, allPlayers.data, activeTeamId);
  }, [pbp.data, allPlayers.data, activeTeamId]);

  const teamTotals = useMemo(() => buildTeamTotals(playerLines), [playerLines]);

  const insights = useMemo(() => {
    const teamName = teamMap.get(activeTeamId) ?? "ทีม";
    return buildCoachInsights(playerLines, teamZones, teamName);
  }, [playerLines, teamZones, teamMap, activeTeamId]);

  const madeShots = shotMarkers.filter((s) => s.made).length;
  const hasEvents = (pbp.data?.length ?? 0) > 0;
  const hasShots = shotMarkers.length > 0;

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>รายงานสรุปย้อนหลัง</h1>
        <p className="muted">
          รายงานสำหรับโค้ช — สถิติพื้นฐาน สถิติขั้นสูง และแผนภาพการยิง
        </p>
      </header>

      <section className="panel">
        <h2>เลือกแมตช์</h2>
        {games.isLoading && <p>โหลด…</p>}
        {games.isError && (
          <p className="err">{(games.error as Error).message}</p>
        )}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>คู่แข่ง</th>
                <th>สถานะ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(games.data ?? []).map((g) => (
                <tr
                  key={g.id}
                  className={selectedGameId === g.id ? "selected" : ""}
                >
                  <td>
                    {g.scheduled_at
                      ? new Date(g.scheduled_at).toLocaleString("th-TH")
                      : "—"}
                  </td>
                  <td>
                    {teamMap.get(g.home_team_id) ?? "?"} vs{" "}
                    {teamMap.get(g.away_team_id) ?? "?"}
                  </td>
                  <td>
                    <span className={`badge status-${g.status}`}>
                      {g.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn tiny primary"
                      onClick={() => {
                        setSelectedGameId(g.id);
                        setTeamFilter(g.home_team_id);
                        setTab("insights");
                      }}
                    >
                      ดูรายงาน
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedGame && (
        <>
          <div className="report-toolbar">
            <label className="field-inline">
              วิเคราะห์ทีม
              <select
                value={activeTeamId}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value={selectedGame.home_team_id}>
                  {teamMap.get(selectedGame.home_team_id)} (เจ้าบ้าน)
                </option>
                <option value={selectedGame.away_team_id}>
                  {teamMap.get(selectedGame.away_team_id)} (เยือน)
                </option>
              </select>
            </label>
            <div className="report-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tab === t.id ? "tab active" : "tab"}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {pbp.isLoading && <p className="muted">โหลดสถิติ…</p>}
          {pbp.isError && <p className="err">{(pbp.error as Error).message}</p>}

          {!pbp.isLoading && !hasEvents && (
            <section className="panel">
              <p className="muted">
                ยังไม่มีข้อมูลในแมตช์นี้ — บันทึกผ่าน Courtside แล้วซิงก์ก่อน
              </p>
            </section>
          )}

          {hasEvents && tab === "insights" && (
            <section className="panel">
              <h2>คำแนะนำโค้ช — {teamMap.get(activeTeamId)}</h2>
              <p className="muted report-note">
                สรุปอัตโนมัติจากสถิติแมตช์ — ใช้ประกอบการวิเคราะห์ ไม่แทนที่การดูเกม
              </p>
              {insights.length === 0 && (
                <p className="muted">ยังไม่มีข้อมูลชู้ตพอสำหรับคำแนะนำ</p>
              )}
              <ul className="insight-list">
                {insights.map((item, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: insights are ordered text
                  <li key={i} className={`insight insight-${item.level}`}>
                    {item.text}
                  </li>
                ))}
              </ul>
              {teamTotals && (
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-label">คะแนน</span>
                    <strong>{teamTotals.pts}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">eFG%</span>
                    <strong>{fmtPct(teamTotals.efg)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">TS%</span>
                    <strong>{fmtPct(teamTotals.ts)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">แต้ม/ช็อต</span>
                    <strong>{teamTotals.ppp?.toFixed(2) ?? "—"}</strong>
                  </div>
                </div>
              )}
            </section>
          )}

          {hasEvents && tab === "box" && (
            <section className="panel">
              <h2>สถิติพื้นฐาน (Box Score) — {teamMap.get(activeTeamId)}</h2>
              <p className="muted report-note">
                PTS คะแนน · REB รีบาวด์ · AST แอสซิสต์ · STL สตีล · BLK บล็อก · TO
                เทิร์นโอเวอร์ · PF ฟาวล์
              </p>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ผู้เล่น</th>
                      <th>PTS</th>
                      <th>REB</th>
                      <th>AST</th>
                      <th>STL</th>
                      <th>BLK</th>
                      <th>TO</th>
                      <th>PF</th>
                      <th>FG</th>
                      <th>3PT</th>
                      <th>FT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullBox.map((l) => (
                      <tr key={l.playerId}>
                        <td>{l.jersey}</td>
                        <td>{l.playerName}</td>
                        <td>
                          <strong>{l.pts}</strong>
                        </td>
                        <td>{l.reb}</td>
                        <td>{l.ast}</td>
                        <td>{l.stl}</td>
                        <td>{l.blk}</td>
                        <td>{l.tov}</td>
                        <td>{l.pf}</td>
                        <td>
                          {l.fgm}/{l.fga}
                        </td>
                        <td>
                          {l.tpm}/{l.tpa}
                        </td>
                        <td>
                          {l.ftm}/{l.fta}
                        </td>
                      </tr>
                    ))}
                    {boxTotals && (
                      <tr className="total-row">
                        <td colSpan={2}>
                          <strong>รวมทีม</strong>
                        </td>
                        <td>
                          <strong>{boxTotals.pts}</strong>
                        </td>
                        <td>{boxTotals.reb}</td>
                        <td>{boxTotals.ast}</td>
                        <td>{boxTotals.stl}</td>
                        <td>{boxTotals.blk}</td>
                        <td>{boxTotals.tov}</td>
                        <td>{boxTotals.pf}</td>
                        <td>
                          {boxTotals.fgm}/{boxTotals.fga}
                        </td>
                        <td>
                          {boxTotals.tpm}/{boxTotals.tpa}
                        </td>
                        <td>
                          {boxTotals.ftm}/{boxTotals.fta}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {fullBox.every(
                (l) => l.reb + l.ast + l.stl + l.blk + l.tov === 0,
              ) && (
                <p className="muted report-note">
                  * REB/AST/STL/BLK/TO จะแสดงเมื่อ Courtside บันทึกอีเวนต์เหล่านี้
                  (ปัจจุบันบันทึกการยิงเป็นหลัก)
                </p>
              )}
            </section>
          )}

          {hasEvents && tab === "advanced" && (
            <section className="panel">
              <h2>สถิติขั้นสูง — {teamMap.get(activeTeamId)}</h2>
              <p className="muted report-note">
                Rating = แต้มต่อการครองบอล 100 ครั้ง · Pace = จำนวนการครองบอลต่อเกม ·
                eFG% ถ่วงน้ำหนักลูก 3 แต้ม
              </p>
              {advanced && (
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-label">Off Rating</span>
                    <strong>{fmtRating(advanced.offRtg)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Def Rating</span>
                    <strong>{fmtRating(advanced.defRtg)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Net Rating</span>
                    <strong
                      className={
                        advanced.netRtg === null
                          ? ""
                          : advanced.netRtg >= 0
                            ? "pct-good"
                            : "pct-warn"
                      }
                    >
                      {advanced.netRtg === null
                        ? "—"
                        : `${advanced.netRtg >= 0 ? "+" : ""}${advanced.netRtg.toFixed(1)}`}
                    </strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Pace</span>
                    <strong>{fmtRating(advanced.pace)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">eFG%</span>
                    <strong>{fmtPct(advanced.efg)}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">TOV%</span>
                    <strong>{fmtPct(advanced.tovPct)}</strong>
                  </div>
                </div>
              )}

              <h2 style={{ marginTop: "1.1rem" }}>ประสิทธิภาพรายผู้เล่น</h2>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ผู้เล่น</th>
                      <th>FG%</th>
                      <th>2P%</th>
                      <th>3P%</th>
                      <th>eFG%</th>
                      <th>TS%</th>
                      <th>PPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerLines.map((line) => (
                      <tr key={line.playerId}>
                        <td>
                          {line.jersey} {line.playerName}
                        </td>
                        <td className={pctClass(line.fgPct, 0.45)}>
                          {fmtPct(line.fgPct)}
                        </td>
                        <td>{fmtPct(line.twoPct)}</td>
                        <td>{fmtPct(line.threePct)}</td>
                        <td className={pctClass(line.efg, 0.5)}>
                          {fmtPct(line.efg)}
                        </td>
                        <td className={pctClass(line.ts, 0.55)}>
                          {fmtPct(line.ts)}
                        </td>
                        <td>{line.ppp?.toFixed(2) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {hasEvents && tab === "shotchart" && (
            <section className="panel">
              <h2>แผนภาพการยิง (Shot Chart) — {teamMap.get(activeTeamId)}</h2>
              <p className="muted report-note">
                จุดเขียว = ยิงเข้า · กากบาทแดง = ยิงพลาด · โซนเขียว = ถนัด (Hot) ·
                โซนแดง = ไม่ถนัด (Cold)
              </p>
              {!hasShots && <p className="muted">ยังไม่มีพิกัดการยิงในแมตช์นี้</p>}
              {hasShots && (
                <div className="shotchart-wrap">
                  <ShotChartView shots={shotMarkers} zones={zoneShades} />
                  <div className="shotchart-side">
                    <div className="stat-cards">
                      <div className="stat-card">
                        <span className="stat-label">ยิงทั้งหมด</span>
                        <strong>{shotMarkers.length}</strong>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">เข้า</span>
                        <strong className="pct-good">{madeShots}</strong>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">FG%</span>
                        <strong>
                          {fmtPct(
                            shotMarkers.length > 0
                              ? madeShots / shotMarkers.length
                              : null,
                          )}
                        </strong>
                      </div>
                    </div>
                    <ul className="zone-legend">
                      {teamZones.map((z) => (
                        <li key={z.zone}>
                          <span
                            className={`legend-dot ${
                              z.pct === null
                                ? ""
                                : z.pct >= 0.5
                                  ? "hot"
                                  : z.pct < 0.35
                                    ? "cold"
                                    : "warm"
                            }`}
                          />
                          {z.label}: {fmtPct(z.pct)} ({z.fgm}/{z.fga})
                        </li>
                      ))}
                    </ul>
                    <p className="muted">
                      ใต้แป้น {distanceSplit.near} · ระยะไกล {distanceSplit.far}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {hasEvents && tab === "zones" && (
            <>
              <section className="panel">
                <h2>โซนการยิง — ทีมรวม</h2>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>โซน</th>
                        <th>FGM</th>
                        <th>FGA</th>
                        <th>FG%</th>
                        <th>สัดส่วน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamZones.map((z) => {
                        const totalFga = teamZones.reduce(
                          (s, x) => s + x.fga,
                          0,
                        );
                        return (
                          <tr key={z.zone}>
                            <td>{z.label}</td>
                            <td>{z.fgm}</td>
                            <td>{z.fga}</td>
                            <td className={pctClass(z.pct, 0.45)}>
                              {fmtPct(z.pct)}
                            </td>
                            <td>
                              {totalFga > 0 ? fmtPct(z.fga / totalFga) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <h2>โซนการยิง — รายผู้เล่น</h2>
                <div className="zone-grid">
                  {playerZones.map((row) => (
                    <div key={row.playerId} className="zone-card">
                      <h3>
                        {row.jersey} {row.playerName}
                      </h3>
                      <table className="data-table compact">
                        <thead>
                          <tr>
                            <th>โซน</th>
                            <th>FG</th>
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.zones
                            .filter((z) => z.fga > 0)
                            .map((z) => (
                              <tr key={z.zone}>
                                <td>{z.label}</td>
                                <td>
                                  {z.fgm}/{z.fga}
                                </td>
                                <td>{fmtPct(z.pct)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function pctClass(pct: number | null, good: number): string {
  if (pct === null) return "";
  if (pct >= good) return "pct-good";
  if (pct < good - 0.12) return "pct-warn";
  return "";
}
