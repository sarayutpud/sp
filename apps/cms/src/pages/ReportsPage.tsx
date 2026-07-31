import { ShotChartView } from "@sp/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchGames, fetchPbp, fetchPlayers, fetchTeams } from "../lib/api";
import {
  buildCoachInsights,
  buildCoachPlayerLines,
  buildPlayerZones,
  buildTeamTotals,
  buildTeamZones,
  fmtPct,
} from "../lib/coach-reports";
import { analyzeEventCoverage } from "../lib/coverage";
import {
  buildMatchShareCsv,
  copyText,
  downloadElementPng,
  downloadTextFile,
  publicReportUrl,
} from "../lib/share-report";
import {
  buildFullBoxScore,
  buildShotMarkers,
  buildTeamAdvanced,
  shotDistanceSplit,
  sumBoxLines,
} from "../lib/stats-reports";
import { gameMatchLabel } from "../lib/types";
import { SeasonReportPage } from "./SeasonReportPage";

type ReportTab = "insights" | "box" | "advanced" | "shotchart" | "zones";
type ReportScope = "match" | "season";

const RECENT_LIMIT = 10;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: ReportScope =
    searchParams.get("scope") === "season" ? "season" : "match";
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [tab, setTab] = useState<ReportTab>("insights");
  const [shareMsg, setShareMsg] = useState("");
  const [exportingImage, setExportingImage] = useState(false);
  const reportCaptureRef = useRef<HTMLDivElement>(null);

  const setScope = (next: ReportScope) => {
    if (next === "season") setSearchParams({ scope: "season" });
    else setSearchParams({});
  };

  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const recentGames = useMemo(
    () => (games.data ?? []).slice(0, RECENT_LIMIT),
    [games.data],
  );

  const selectedGame = games.data?.find((g) => g.id === selectedGameId);

  const activeTeamId =
    teamFilter || selectedGame?.our_team_id || teams.data?.[0]?.id || "";

  const oppTeamId = "";

  const matchLabel = selectedGame
    ? gameMatchLabel(
        teamMap.get(selectedGame.our_team_id) ?? "?",
        selectedGame.opponent_name,
        selectedGame.our_side,
      )
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
  }, [pbp.data, activeTeamId]);

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

  const sharePayload = useMemo(() => {
    if (!selectedGame) return null;
    return {
      matchLabel,
      teamName: teamMap.get(activeTeamId) ?? "ทีม",
      scheduledAt: selectedGame.scheduled_at,
      box: fullBox,
      insights: insights.map((i) => i.text),
      totals: boxTotals
        ? {
            pts: boxTotals.pts,
            reb: boxTotals.reb,
            ast: boxTotals.ast,
            fgm: boxTotals.fgm,
            fga: boxTotals.fga,
            tpm: boxTotals.tpm,
            tpa: boxTotals.tpa,
          }
        : null,
    };
  }, [
    selectedGame,
    matchLabel,
    teamMap,
    activeTeamId,
    fullBox,
    insights,
    boxTotals,
  ]);

  const madeShots = shotMarkers.filter((s) => s.made).length;
  const hasEvents = (pbp.data?.length ?? 0) > 0;
  const hasShots = shotMarkers.length > 0;
  const coverage = useMemo(
    () => analyzeEventCoverage(pbp.data ?? [], activeTeamId),
    [pbp.data, activeTeamId],
  );

  const exportReportImage = async () => {
    if (!selectedGameId || !reportCaptureRef.current) return;
    const short = selectedGameId.slice(0, 8);
    const tabSlug = tab;
    setExportingImage(true);
    setShareMsg("");
    try {
      await downloadElementPng(
        reportCaptureRef.current,
        `sp-report-${short}-${tabSlug}.png`,
      );
      setShareMsg(`ดาวน์โหลด sp-report-${short}-${tabSlug}.png แล้ว`);
    } catch (err) {
      setShareMsg(err instanceof Error ? err.message : "ดาวน์โหลดรูปไม่สำเร็จ");
    } finally {
      setExportingImage(false);
    }
  };

  const exportCsv = () => {
    if (!sharePayload || !selectedGameId) return;
    const short = selectedGameId.slice(0, 8);
    downloadTextFile(
      `sp-report-${short}.csv`,
      buildMatchShareCsv(sharePayload),
      "text/csv;charset=utf-8",
    );
    setShareMsg(`ดาวน์โหลด sp-report-${short}.csv แล้ว`);
  };

  const publicUrl = selectedGameId ? publicReportUrl(selectedGameId) : "";

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    const ok = await copyText(publicUrl);
    setShareMsg(ok ? "คัดลอกลิงก์สาธารณะแล้ว" : "คัดลอกไม่สำเร็จ — คัดลอกจากช่องลิงก์เอง");
  };

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>รายงาน</h1>
        <p className="muted">สถิติทีมเรา — แมตช์เดี่ยวหรือรวมฤดูกาล (ไม่รวมรายคนคู่แข่ง)</p>
      </header>

      <div className="scope-tabs" role="tablist" aria-label="ประเภทรายงาน">
        <button
          type="button"
          role="tab"
          aria-selected={scope === "match"}
          className={scope === "match" ? "tab active" : "tab"}
          onClick={() => setScope("match")}
        >
          แมตช์
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "season"}
          className={scope === "season" ? "tab active" : "tab"}
          onClick={() => setScope("season")}
        >
          ฤดูกาล
        </button>
      </div>

      {scope === "season" ? (
        <SeasonReportPage embedded />
      ) : (
        <>
          <section className="panel">
            <h2>เลือกแมตช์ (10 นัดล่าสุด)</h2>
            <p className="muted report-note">
              สร้างแมตช์ใหม่ได้ที่เมนูแมตช์ — แล้วบันทึกจาก Courtside แล้วซิงก์
            </p>
            {games.isLoading && <p>โหลด…</p>}
            {games.isError && (
              <p className="err">{(games.error as Error).message}</p>
            )}
            {!games.isLoading && recentGames.length === 0 && (
              <div className="empty-state">
                <h3>ยังไม่มีแมตช์</h3>
                <ol className="empty-steps">
                  <li>สร้างแมตช์ในเมนูแมตช์</li>
                  <li>เปิด Courtside บันทึกสถิติทีมเรา</li>
                  <li>กดซิงก์ แล้วกลับมาเลือกรายงาน</li>
                </ol>
                <Link to="/games" className="btn primary">
                  ไปสร้างแมตช์
                </Link>
              </div>
            )}
            {recentGames.length > 0 && (
              <div className="table-scroll">
                <table className="data-table wrap-cells">
                  <thead>
                    <tr>
                      <th>แมตช์</th>
                      <th>สถานะ</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recentGames.map((g) => (
                      <tr
                        key={g.id}
                        className={selectedGameId === g.id ? "selected" : ""}
                      >
                        <td className="cell-stack">
                          <span className="cell-primary">
                            {gameMatchLabel(
                              teamMap.get(g.our_team_id) ?? "?",
                              g.opponent_name,
                              g.our_side,
                            )}
                          </span>
                          <span className="cell-muted">
                            <span className="side-chip">
                              {g.our_side === "HOME"
                                ? "เราเป็นเหย้า"
                                : "เราเป็นเยือน"}
                            </span>
                            {" · "}
                            {g.scheduled_at
                              ? new Date(g.scheduled_at).toLocaleString("th-TH")
                              : "—"}
                          </span>
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
                              setTeamFilter(g.our_team_id);
                              setTab("insights");
                              setShareMsg("");
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
            )}
          </section>

          {selectedGame && (
            <>
              <div className="report-toolbar">
                <span className="muted">
                  วิเคราะห์ทีม:{" "}
                  <strong>{teamMap.get(activeTeamId) ?? "ทีมเรา"}</strong>
                </span>
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

              {hasEvents && coverage.missingLabels.length > 0 && (
                <div className="banner warn">
                  ข้อมูลยังไม่ครบสำหรับวิเคราะห์เต็มรูปแบบ — ยังไม่มี:{" "}
                  {coverage.missingLabels.join(", ")}
                  {!coverage.hasReb || !coverage.hasTo
                    ? " · OffRtg/possessions อาจคลาดเคลื่อน"
                    : ""}
                </div>
              )}

              {selectedGame && (
                <section className="panel">
                  <h2>แชร์รายงานนัดนี้</h2>
                  <p className="muted report-note">
                    ส่งลิงก์สาธารณะให้คนอื่นดูผลได้โดยไม่ต้องล็อกอิน — หรือดาวน์โหลดรูป/CSV ของ{" "}
                    {matchLabel}
                    {teamMap.get(activeTeamId)
                      ? ` — ${teamMap.get(activeTeamId)}`
                      : ""}
                  </p>
                  <div className="public-link-row">
                    <input
                      className="public-link-input"
                      readOnly
                      value={publicUrl}
                      aria-label="ลิงก์สาธารณะ"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => void copyPublicLink()}
                    >
                      คัดลอกลิงก์
                    </button>
                    <a
                      className="btn"
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      เปิดดู
                    </a>
                  </div>
                  <div className="report-export-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={exportingImage || !hasEvents}
                      onClick={() => void exportReportImage()}
                    >
                      {exportingImage ? "กำลังสร้างรูป…" : "ดาวน์โหลดรูปรายงาน"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!hasEvents}
                      onClick={exportCsv}
                    >
                      ดาวน์โหลด CSV
                    </button>
                    {shareMsg && <span className="muted">{shareMsg}</span>}
                  </div>
                </section>
              )}

              <div ref={reportCaptureRef} className="report-capture-root">
                {hasEvents && (
                  <div className="report-capture-meta">
                    <strong>SP FITNESS — {matchLabel}</strong>
                    <span>
                      {teamMap.get(activeTeamId)} ·{" "}
                      {TABS.find((t) => t.id === tab)?.label}
                      {selectedGame?.scheduled_at
                        ? ` · ${new Date(selectedGame.scheduled_at).toLocaleString("th-TH")}`
                        : ""}
                    </span>
                  </div>
                )}

                {pbp.isLoading && <p className="muted">โหลดสถิติ…</p>}
                {pbp.isError && (
                  <p className="err">{(pbp.error as Error).message}</p>
                )}

                {!pbp.isLoading && !hasEvents && (
                  <section className="panel">
                    <div className="empty-state">
                      <h3>ยังไม่มีข้อมูลในแมตช์นี้</h3>
                      <ol className="empty-steps">
                        <li>เปิด Courtside เลือกแมตช์นี้</li>
                        <li>บันทึกช็อตและเหตุการณ์ทีมเรา</li>
                        <li>กดซิงก์ แล้วรีเฟรชรายงาน</li>
                      </ol>
                    </div>
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
                      PTS คะแนน · REB รีบาวด์ · AST แอสซิสต์ · STL สตีล · BLK บล็อก ·
                      TO เทิร์นโอเวอร์ · PF ฟาวล์
                    </p>
                    <div className="table-scroll">
                      <table className="data-table wrap-cells sticky-name mobile-priority">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>ผู้เล่น</th>
                            <th>PTS</th>
                            <th>REB</th>
                            <th className="hide-sm">AST</th>
                            <th className="hide-sm">STL</th>
                            <th className="hide-sm">BLK</th>
                            <th className="hide-sm">TO</th>
                            <th className="hide-sm">PF</th>
                            <th>FG</th>
                            <th className="hide-sm">3PT</th>
                            <th className="hide-sm">FT</th>
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
                              <td className="hide-sm">{l.ast}</td>
                              <td className="hide-sm">{l.stl}</td>
                              <td className="hide-sm">{l.blk}</td>
                              <td className="hide-sm">{l.tov}</td>
                              <td className="hide-sm">{l.pf}</td>
                              <td>
                                {l.fgm}/{l.fga}
                              </td>
                              <td className="hide-sm">
                                {l.tpm}/{l.tpa}
                              </td>
                              <td className="hide-sm">
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
                              <td className="hide-sm">{boxTotals.ast}</td>
                              <td className="hide-sm">{boxTotals.stl}</td>
                              <td className="hide-sm">{boxTotals.blk}</td>
                              <td className="hide-sm">{boxTotals.tov}</td>
                              <td className="hide-sm">{boxTotals.pf}</td>
                              <td>
                                {boxTotals.fgm}/{boxTotals.fga}
                              </td>
                              <td className="hide-sm">
                                {boxTotals.tpm}/{boxTotals.tpa}
                              </td>
                              <td className="hide-sm">
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
                      Rating = แต้มต่อการครองบอล 100 ครั้ง · Pace =
                      จำนวนการครองบอลต่อเกม · eFG% ถ่วงน้ำหนักลูก 3 แต้ม
                    </p>
                    {!advanced && (
                      <div className="banner info">
                        สถิติขั้นสูงบางตัวต้องการข้อมูลคู่แข่ง — โหมดทีมเรายังไม่บันทึกคู่แข่ง
                      </div>
                    )}
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
                      <table className="data-table wrap-cells">
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
                              <td className="cell-stack">
                                <span className="cell-primary">
                                  {line.playerName}
                                </span>
                                <span className="cell-muted">
                                  #{line.jersey}
                                </span>
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
                    <h2>
                      แผนภาพการยิง (Shot Chart) — {teamMap.get(activeTeamId)}
                    </h2>
                    <p className="muted report-note">
                      จุดเขียว = ยิงเข้า · กากบาทแดง = ยิงพลาด · โซนเขียว = ถนัด (Hot)
                      · โซนแดง = ไม่ถนัด (Cold)
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
                            ใต้แป้น {distanceSplit.near} · ระยะไกล{" "}
                            {distanceSplit.far}
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
                        <table className="data-table wrap-cells">
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
                      <h2>โซนการยิง — รายผู้เล่น</h2>
                      <div className="zone-grid">
                        {playerZones.map((row) => (
                          <div key={row.playerId} className="zone-card">
                            <h3>
                              {row.jersey} {row.playerName}
                            </h3>
                            <table className="data-table compact wrap-cells">
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
              </div>
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
