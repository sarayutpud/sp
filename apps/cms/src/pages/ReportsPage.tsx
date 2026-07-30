import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  buildCoachInsights,
  buildCoachPlayerLines,
  buildPlayerZones,
  buildTeamTotals,
  buildTeamZones,
  fmtPct,
} from "../lib/coach-reports";
import { fetchGames, fetchPbp, fetchPlayers, fetchTeams } from "../lib/api";

type ReportTab = "box" | "efficiency" | "zones" | "insights";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "box", label: "สรุปคะแนน" },
  { id: "efficiency", label: "ประสิทธิภาพการชู้ต" },
  { id: "zones", label: "โซนการชู้ต" },
  { id: "insights", label: "คำแนะนำโค้ช" },
];

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
    teamFilter ||
    selectedGame?.home_team_id ||
    teams.data?.[0]?.id ||
    "";

  const pbp = useQuery({
    queryKey: ["pbp", selectedGameId],
    queryFn: () => fetchPbp(selectedGameId!),
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

  const teamZones = useMemo(() => {
    if (!pbp.data) return [];
    return buildTeamZones(pbp.data, activeTeamId);
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

  const hasData = playerLines.length > 0;

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>รายงานสรุปย้อนหลัง</h1>
        <p className="muted">
          รายงานสำหรับโค้ช — ประเมินประสิทธิภาพการชู้ต โซนลูก และจุดที่ควรปรับปรุง
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
                  <span className={`badge status-${g.status}`}>{g.status}</span>
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
          {pbp.isError && (
            <p className="err">{(pbp.error as Error).message}</p>
          )}

          {!pbp.isLoading && !hasData && (
            <section className="panel">
              <p className="muted">
                ยังไม่มีข้อมูลชู้ตในแมตช์นี้ — บันทึกผ่าน Courtside แล้วซิงก์ก่อน
              </p>
            </section>
          )}

          {hasData && tab === "insights" && (
            <section className="panel">
              <h2>
                คำแนะนำโค้ช — {teamMap.get(activeTeamId)}
              </h2>
              <p className="muted report-note">
                สรุปอัตโนมัติจากสถิติแมตช์ — ใช้ประกอบการวิเคราะห์ ไม่แทนที่การดูเกม
              </p>
              <ul className="insight-list">
                {insights.map((item, i) => (
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

          {hasData && tab === "box" && (
            <section className="panel">
              <h2>Box Score — {teamMap.get(activeTeamId)}</h2>
              <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>เบอร์</th>
                    <th>ผู้เล่น</th>
                    <th>PTS</th>
                    <th>FG</th>
                    <th>3PT</th>
                    <th>2PT</th>
                  </tr>
                </thead>
                <tbody>
                  {playerLines.map((line) => (
                    <tr key={line.playerId}>
                      <td>{line.jersey}</td>
                      <td>{line.playerName}</td>
                      <td>{line.pts}</td>
                      <td>
                        {line.fgm}/{line.fga}
                      </td>
                      <td>
                        {line.tpm}/{line.tpa}
                      </td>
                      <td>
                        {line.fgm2}/{line.fga2}
                      </td>
                    </tr>
                  ))}
                  {teamTotals && (
                    <tr className="total-row">
                      <td colSpan={2}>
                        <strong>รวมทีม</strong>
                      </td>
                      <td>
                        <strong>{teamTotals.pts}</strong>
                      </td>
                      <td>
                        <strong>
                          {teamTotals.fgm}/{teamTotals.fga}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {teamTotals.tpm}/{teamTotals.tpa}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {teamTotals.fgm2}/{teamTotals.fga2}
                        </strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </section>
          )}

          {hasData && tab === "efficiency" && (
            <section className="panel">
              <h2>ประสิทธิภาพการชู้ต (Advanced)</h2>
              <p className="muted report-note">
                eFG% ปรับค่าสามแต้ม · TS% รวมความแม่นทุกช็อต · PPP = แต้มต่อการยิง
              </p>
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

          {hasData && tab === "zones" && (
            <>
              <section className="panel">
                <h2>โซนการชู้ต — ทีมรวม</h2>
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
                            {totalFga > 0
                              ? fmtPct(z.fga / totalFga)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </section>

              <section className="panel">
                <h2>โซนการชู้ต — รายผู้เล่น</h2>
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
