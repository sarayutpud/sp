import { ShotChartView } from "@sp/ui";
import { useQueries, useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MatchBoxView } from "../components/MatchBoxView";
import {
  buildCoachInsights,
  buildCoachPlayerLines,
  buildPlayerZones,
  buildTeamTotals,
  buildTeamZones,
  fmtPct,
} from "../lib/coach-reports";
import {
  fetchGameRosters,
  fetchGames,
  fetchPbp,
  fetchPeriodScores,
  fetchPlayers,
  fetchTeams,
} from "../lib/api";
import {
  downloadMatchBoxExcel,
  downloadMatchBoxPdf,
  downloadShotchartPdf,
  downloadZonesExcel,
  downloadZonesPdf,
} from "../lib/export-reports";
import { buildCmsMatchBoxScore } from "../lib/match-box";
import {
  buildPlayerEvalCard,
  buildPlayerEvalTrend,
} from "../lib/player-eval";
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
  shotDistanceSplit,
  sumBoxLines,
} from "../lib/stats-reports";
import { gameMatchLabel, gameStatusLabel } from "../lib/types";
import { SeasonReportPage } from "./SeasonReportPage";

type ReportTab = "box" | "insights" | "shotchart" | "zones" | "player";
type ReportScope = "match" | "season";

const RECENT_LIMIT = 10;
const TABS: { id: ReportTab; label: string }[] = [
  { id: "box", label: "ใบสถิตินัด" },
  { id: "insights", label: "สรุปโค้ช" },
  { id: "player", label: "ประเมินผู้เล่น" },
  { id: "shotchart", label: "แผนภาพการยิง" },
  { id: "zones", label: "โซนการยิง" },
];

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: ReportScope =
    searchParams.get("scope") === "season" ? "season" : "match";
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [tab, setTab] = useState<ReportTab>("box");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [exportingImage, setExportingImage] = useState(false);
  const reportCaptureRef = useRef<HTMLDivElement>(null);
  const shotChartRef = useRef<HTMLDivElement>(null);

  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const selectedGame = games.data?.find((game) => game.id === selectedGameId);
  const pbp = useQuery({
    queryKey: ["pbp", selectedGameId],
    queryFn: () => fetchPbp(selectedGameId!),
    enabled: !!selectedGameId,
  });
  const periodScores = useQuery({
    queryKey: ["period-scores", selectedGameId],
    queryFn: () => fetchPeriodScores(selectedGameId!),
    enabled: !!selectedGameId,
  });
  const allPlayers = useQuery({
    queryKey: ["players-all"],
    queryFn: () => fetchPlayers(),
    enabled: !!selectedGameId,
  });
  const gameRosters = useQuery({
    queryKey: ["game-rosters", selectedGameId],
    queryFn: () => fetchGameRosters(selectedGameId!),
    enabled: !!selectedGameId,
  });

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((team) => [team.id, team.name])),
    [teams.data],
  );
  const recentGames = useMemo(
    () => (games.data ?? []).slice(0, RECENT_LIMIT),
    [games.data],
  );
  const activeTeamId =
    teamFilter || selectedGame?.our_team_id || teams.data?.[0]?.id || "";
  const matchLabel = selectedGame
    ? gameMatchLabel(
        teamMap.get(selectedGame.our_team_id) ?? "?",
        selectedGame.opponent_name,
        selectedGame.our_side,
      )
    : "";
  const playerLines = useMemo(
    () =>
      pbp.data && allPlayers.data
        ? buildCoachPlayerLines(pbp.data, allPlayers.data, activeTeamId)
        : [],
    [pbp.data, allPlayers.data, activeTeamId],
  );
  const fullBox = useMemo(
    () =>
      pbp.data && allPlayers.data
        ? buildFullBoxScore(pbp.data, allPlayers.data, activeTeamId)
        : [],
    [pbp.data, allPlayers.data, activeTeamId],
  );
  const boxTotals = useMemo(() => sumBoxLines(fullBox), [fullBox]);
  const teamZones = useMemo(
    () => (pbp.data ? buildTeamZones(pbp.data, activeTeamId) : []),
    [pbp.data, activeTeamId],
  );
  const playerZones = useMemo(
    () =>
      pbp.data && allPlayers.data
        ? buildPlayerZones(pbp.data, allPlayers.data, activeTeamId)
        : [],
    [pbp.data, allPlayers.data, activeTeamId],
  );
  const shotMarkers = useMemo(
    () => (pbp.data ? buildShotMarkers(pbp.data, activeTeamId) : []),
    [pbp.data, activeTeamId],
  );
  const distanceSplit = useMemo(
    () =>
      pbp.data
        ? shotDistanceSplit(pbp.data, activeTeamId)
        : { near: 0, far: 0 },
    [pbp.data, activeTeamId],
  );
  const zoneShades = useMemo(() => {
    const find = (zone: "paint" | "mid" | "three") =>
      teamZones.find((item) => item.zone === zone)?.pct ?? null;
    return { paint: find("paint"), mid: find("mid"), three: find("three") };
  }, [teamZones]);
  const teamTotals = useMemo(() => buildTeamTotals(playerLines), [playerLines]);
  const insights = useMemo(
    () =>
      buildCoachInsights(
        playerLines,
        teamZones,
        teamMap.get(activeTeamId) ?? "ทีม",
      ),
    [playerLines, teamZones, teamMap, activeTeamId],
  );
  const matchBox = useMemo(() => {
    if (!selectedGame || !allPlayers.data || !teams.data) return null;
    const homeStarters = (gameRosters.data ?? [])
      .filter(
        (r) => r.team_id === selectedGame.home_team_id && r.is_starter,
      )
      .map((r) => r.player_id);
    const awayStarters = (gameRosters.data ?? [])
      .filter(
        (r) => r.team_id === selectedGame.away_team_id && r.is_starter,
      )
      .map((r) => r.player_id);
    return buildCmsMatchBoxScore({
      game: selectedGame,
      events: pbp.data ?? [],
      players: allPlayers.data,
      teams: teams.data,
      periodScores: (periodScores.data ?? []).map((score) => ({
        period: score.period,
        homePoints: score.home_points,
        awayPoints: score.away_points,
      })),
      homeStarters,
      awayStarters,
    });
  }, [
    selectedGame,
    allPlayers.data,
    teams.data,
    pbp.data,
    periodScores.data,
    gameRosters.data,
  ]);
  const hasEvents = (pbp.data?.length ?? 0) > 0;
  const hasBoxData =
    !!matchBox &&
    (hasEvents ||
      matchBox.home.players.length > 0 ||
      matchBox.away.players.length > 0);
  const hasShots = shotMarkers.length > 0;
  const madeShots = shotMarkers.filter((shot) => shot.made).length;

  useEffect(() => {
    if (fullBox.length === 0) {
      setSelectedPlayerId("");
      return;
    }
    if (
      selectedPlayerId &&
      fullBox.some((line) => line.playerId === selectedPlayerId)
    ) {
      return;
    }
    const top = [...fullBox].sort((a, b) => b.pts - a.pts)[0];
    setSelectedPlayerId(top?.playerId ?? "");
  }, [fullBox, selectedPlayerId, selectedGameId, activeTeamId]);

  const fibaPlayerLine = useMemo(() => {
    if (!matchBox || !selectedPlayerId) return null;
    return (
      matchBox.home.players.find((p) => p.playerId === selectedPlayerId) ??
      matchBox.away.players.find((p) => p.playerId === selectedPlayerId) ??
      null
    );
  }, [matchBox, selectedPlayerId]);

  const playerEvalCard = useMemo(() => {
    const box = fullBox.find((line) => line.playerId === selectedPlayerId);
    if (!box) return null;
    const coach =
      playerLines.find((line) => line.playerId === selectedPlayerId) ?? null;
    const zones =
      playerZones.find((row) => row.playerId === selectedPlayerId)?.zones ?? [];
    return buildPlayerEvalCard({
      box,
      coach,
      zones,
      ef: fibaPlayerLine?.ef ?? null,
      plusMinus: fibaPlayerLine?.plusMinus ?? null,
    });
  }, [fullBox, selectedPlayerId, playerLines, playerZones, fibaPlayerLine]);

  const competitionGames = useMemo(() => {
    if (!selectedGame) return [];
    return (games.data ?? [])
      .filter(
        (game) =>
          game.competition_id === selectedGame.competition_id &&
          game.our_team_id === activeTeamId,
      )
      .slice(0, 12);
  }, [games.data, selectedGame, activeTeamId]);

  const trendPbpQueries = useQueries({
    queries: competitionGames.map((game) => ({
      queryKey: ["pbp", game.id],
      queryFn: () => fetchPbp(game.id),
      enabled: tab === "player" && !!selectedPlayerId && competitionGames.length > 0,
    })),
  });

  const playerTrend = useMemo(() => {
    if (!allPlayers.data || !selectedPlayerId) return [];
    const rows = competitionGames.map((game, index) => {
      const events = trendPbpQueries[index]?.data;
      const box = events
        ? buildFullBoxScore(events, allPlayers.data!, activeTeamId).find(
            (line) => line.playerId === selectedPlayerId,
          )
        : undefined;
      return {
        gameId: game.id,
        label: gameMatchLabel(
          teamMap.get(game.our_team_id) ?? "?",
          game.opponent_name,
          game.our_side,
        ),
        scheduledAt: game.scheduled_at,
        box,
      };
    });
    return buildPlayerEvalTrend(rows);
  }, [
    competitionGames,
    trendPbpQueries,
    allPlayers.data,
    selectedPlayerId,
    activeTeamId,
    teamMap,
  ]);
  const sharePayload = useMemo(
    () =>
      selectedGame
        ? {
            matchLabel,
            teamName: teamMap.get(activeTeamId) ?? "ทีม",
            scheduledAt: selectedGame.scheduled_at,
            box: fullBox,
            insights: insights.map((item) => item.text),
            totals: boxTotals,
          }
        : null,
    [
      selectedGame,
      matchLabel,
      teamMap,
      activeTeamId,
      fullBox,
      insights,
      boxTotals,
    ],
  );

  const setScope = (next: ReportScope) =>
    setSearchParams(next === "season" ? { scope: "season" } : {});
  const exportReportImage = async () => {
    if (!selectedGameId || !reportCaptureRef.current) return;
    setExportingImage(true);
    setShareMsg("");
    try {
      await downloadElementPng(
        reportCaptureRef.current,
        `sp-report-${selectedGameId.slice(0, 8)}-${tab}.png`,
      );
      setShareMsg("ดาวน์โหลด PNG แล้ว");
    } catch (error) {
      setShareMsg(error instanceof Error ? error.message : "ดาวน์โหลดรูปไม่สำเร็จ");
    } finally {
      setExportingImage(false);
    }
  };
  const exportCsv = () => {
    if (!sharePayload || !selectedGameId) return;
    downloadTextFile(
      `sp-report-${selectedGameId.slice(0, 8)}.csv`,
      buildMatchShareCsv(sharePayload),
      "text/csv;charset=utf-8",
    );
    setShareMsg("ดาวน์โหลด CSV แล้ว");
  };
  const exportShotChartPdf = async () => {
    if (!selectedGameId) return;
    const image = shotChartRef.current
      ? await toPng(shotChartRef.current, { backgroundColor: "#ffffff" })
      : null;
    await downloadShotchartPdf(
      `sp-shotchart-${selectedGameId.slice(0, 8)}.pdf`,
      `Shot Chart — ${teamMap.get(activeTeamId) ?? "ทีม"}`,
      image,
      [
        `${matchLabel} · ${teamMap.get(activeTeamId) ?? "ทีม"}`,
        `ยิง ${shotMarkers.length} · เข้า ${madeShots} · FG% ${fmtPct(
          shotMarkers.length ? madeShots / shotMarkers.length : null,
        )}`,
      ],
    );
  };
  const publicUrl = selectedGameId ? publicReportUrl(selectedGameId) : "";

  return (
    <div className="page-block reports-wide">
      <header className="page-head">
        <h1>รายงาน</h1>
        <p className="muted">ใบสถิติทั้งสองทีมและสรุปผลรายแมตช์</p>
      </header>
      <div className="scope-tabs" role="tablist" aria-label="ประเภทรายงาน">
        {(["match", "season"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={scope === item}
            className={scope === item ? "tab active" : "tab"}
            onClick={() => setScope(item)}
          >
            {item === "match" ? "แมตช์" : "ฤดูกาล"}
          </button>
        ))}
      </div>
      {scope === "season" ? (
        <SeasonReportPage embedded />
      ) : (
        <>
          <section className="panel">
            <h2>เลือกแมตช์</h2>
            <p className="muted report-note">10 นัดล่าสุด — แตะเพื่อเปิดใบสถิติ</p>
            {games.isLoading && <p>โหลด…</p>}
            {games.isError && <p className="err">{(games.error as Error).message}</p>}
            {!games.isLoading && recentGames.length === 0 && (
              <div className="empty-state">
                <h3>ยังไม่มีแมตช์</h3>
                <Link to="/games" className="btn primary">
                  ไปสร้างแมตช์
                </Link>
              </div>
            )}
            {recentGames.length > 0 && (
              <div className="match-pick-list">
                {recentGames.map((game) => {
                  const selected = selectedGameId === game.id;
                  const when = game.scheduled_at
                    ? new Date(game.scheduled_at).toLocaleString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "ยังไม่กำหนดเวลา";
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={
                        selected ? "match-pick-card selected" : "match-pick-card"
                      }
                      onClick={() => {
                        setSelectedGameId(game.id);
                        setTeamFilter(game.our_team_id);
                        setTab("box");
                        setShareMsg("");
                      }}
                    >
                      <span>
                        <span className="match-pick-title">
                          {gameMatchLabel(
                            teamMap.get(game.our_team_id) ?? "?",
                            game.opponent_name,
                            game.our_side,
                          )}
                        </span>
                        <span className="match-pick-meta">
                          <span className={`badge status-${game.status} status-th`}>
                            {gameStatusLabel(game.status)}
                          </span>
                          <span className="muted">{when}</span>
                        </span>
                      </span>
                      <span className={`match-pick-chip ${selected ? "selected" : ""}`}>
                        {selected ? "กำลังดู" : "เปิด"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          {selectedGame && (
            <>
              <div className="report-sticky">
                {tab !== "box" ? (
                  <div className="segment" role="group" aria-label="เลือกทีมวิเคราะห์">
                    {[selectedGame.home_team_id, selectedGame.away_team_id].map(
                      (teamId) => (
                        <button
                          key={teamId}
                          type="button"
                          className={activeTeamId === teamId ? "active" : ""}
                          onClick={() => setTeamFilter(teamId)}
                        >
                          {teamMap.get(teamId) ?? teamId.slice(0, 6)}
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <span className="muted">ใบสถิติทั้งสองทีม</span>
                )}
                <div className="report-tabs">
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={tab === item.id ? "tab active" : "tab"}
                      onClick={() => setTab(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={reportCaptureRef} className="report-capture-root">
                {pbp.isLoading && <p className="muted">โหลดสถิติ…</p>}
                {pbp.isError && (
                  <p className="err">{(pbp.error as Error).message}</p>
                )}
                {tab === "box" && matchBox && (
                  <section className="panel box-score-panel">
                    <div className="export-bar">
                      <button
                        type="button"
                        className="btn primary"
                        disabled={!hasBoxData}
                        onClick={() =>
                          void downloadMatchBoxExcel(
                            matchBox,
                            `sp-match-box-${selectedGame.id.slice(0, 8)}.xlsx`,
                          )
                        }
                      >
                        Excel FIBA
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={!hasBoxData}
                        onClick={() =>
                          void downloadMatchBoxPdf(
                            matchBox,
                            `sp-match-box-${selectedGame.id.slice(0, 8)}.pdf`,
                          )
                        }
                      >
                        PDF FIBA
                      </button>
                      <button
                        type="button"
                        className="btn tiny ghost"
                        disabled={exportingImage}
                        onClick={() => void exportReportImage()}
                      >
                        {exportingImage ? "PNG…" : "PNG"}
                      </button>
                      <button
                        type="button"
                        className="btn tiny ghost"
                        disabled={!hasEvents}
                        onClick={exportCsv}
                      >
                        CSV
                      </button>
                    </div>
                    <MatchBoxView box={matchBox} />
                  </section>
                )}
                {tab === "insights" && (
                  <section className="panel">
                    <h2>สรุปโค้ช — {teamMap.get(activeTeamId)}</h2>
                    {!hasEvents && (
                      <p className="muted">ยังไม่มีข้อมูลเหตุการณ์ในแมตช์นี้</p>
                    )}
                    <ul className="insight-list">
                      {insights.map((item, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: insights are ordered text
                        <li
                          key={index}
                          className={`insight insight-${item.level}`}
                        >
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
                      </div>
                    )}
                  </section>
                )}
                {tab === "player" && (
                  <section className="panel player-eval-panel">
                    <div className="toolbar">
                      <label className="field-inline">
                        ผู้เล่น
                        <select
                          value={selectedPlayerId}
                          onChange={(e) => setSelectedPlayerId(e.target.value)}
                          disabled={fullBox.length === 0}
                        >
                          {fullBox.length === 0 && (
                            <option value="">— ไม่มีข้อมูล —</option>
                          )}
                          {[...fullBox]
                            .sort((a, b) => b.pts - a.pts)
                            .map((line) => (
                              <option key={line.playerId} value={line.playerId}>
                                #{line.jersey} {line.playerName} ({line.pts} PTS)
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    {!playerEvalCard ? (
                      <p className="muted">
                        ยังไม่มีสถิติผู้เล่นในนัดนี้ — ซิงก์จาก Courtside ก่อน
                      </p>
                    ) : (
                      <>
                        <article className="player-eval-card">
                          <header className="player-eval-head">
                            <div>
                              <h2>
                                #{playerEvalCard.jersey}{" "}
                                {playerEvalCard.playerName}
                              </h2>
                              <p className="muted">
                                {matchLabel} · {teamMap.get(activeTeamId)}
                              </p>
                            </div>
                            <span
                              className={`player-eval-band band-${playerEvalCard.band === "ดี" ? "good" : playerEvalCard.band === "ต้องพัฒนา" ? "warn" : "mid"}`}
                            >
                              {playerEvalCard.band}
                            </span>
                          </header>
                          <div className="stat-cards">
                            <div className="stat-card">
                              <span className="stat-label">PTS</span>
                              <strong>{playerEvalCard.pts}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">eFG%</span>
                              <strong>{fmtPct(playerEvalCard.efg)}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">TS%</span>
                              <strong>{fmtPct(playerEvalCard.ts)}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">REB</span>
                              <strong>{playerEvalCard.reb}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">AST</span>
                              <strong>{playerEvalCard.ast}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">EF</span>
                              <strong>
                                {playerEvalCard.ef ?? "—"}
                              </strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">+/−</span>
                              <strong>
                                {playerEvalCard.plusMinus == null
                                  ? "—"
                                  : playerEvalCard.plusMinus > 0
                                    ? `+${playerEvalCard.plusMinus}`
                                    : playerEvalCard.plusMinus}
                              </strong>
                            </div>
                          </div>
                          <p className="muted report-note">
                            FG {playerEvalCard.fgm}/{playerEvalCard.fga} · 3PT{" "}
                            {playerEvalCard.tpm}/{playerEvalCard.tpa} · FT{" "}
                            {playerEvalCard.ftm}/{playerEvalCard.fta} · STL{" "}
                            {playerEvalCard.stl} · BLK {playerEvalCard.blk} · TO{" "}
                            {playerEvalCard.tov} · PF {playerEvalCard.pf}
                          </p>
                          {playerEvalCard.zones.some((z) => z.fga > 0) && (
                            <div className="player-eval-zones">
                              {playerEvalCard.zones
                                .filter((z) => z.fga > 0)
                                .map((z) => (
                                  <span key={z.zone} className="player-eval-zone">
                                    {z.label} {z.fgm}/{z.fga} ({fmtPct(z.pct)})
                                  </span>
                                ))}
                            </div>
                          )}
                          <ul className="insight-list">
                            {playerEvalCard.tips.map((tip, index) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: ordered tips
                              <li key={index} className="insight insight-info">
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </article>
                        <h3 className="player-eval-trend-title">
                          แนวโน้มในลีกเดียวกัน ({playerTrend.length} นัด)
                        </h3>
                        {trendPbpQueries.some((q) => q.isLoading) && (
                          <p className="muted">โหลดสถิติข้ามนัด…</p>
                        )}
                        {playerTrend.length === 0 ? (
                          <p className="muted">
                            ยังไม่มีนัดอื่นในลีกนี้ที่มีสถิติของผู้เล่นคนนี้
                          </p>
                        ) : (
                          <div className="table-scroll">
                            <table className="data-table compact">
                              <thead>
                                <tr>
                                  <th>นัด</th>
                                  <th>PTS</th>
                                  <th>eFG%</th>
                                  <th>REB</th>
                                  <th>AST</th>
                                  <th>FGA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {playerTrend.map((row) => (
                                  <tr key={row.gameId}>
                                    <td className="cell-stack">
                                      <span className="cell-primary">
                                        {row.label}
                                      </span>
                                      <span className="cell-muted">
                                        {row.scheduledAt
                                          ? new Date(
                                              row.scheduledAt,
                                            ).toLocaleDateString("th-TH")
                                          : "—"}
                                      </span>
                                    </td>
                                    <td>{row.pts}</td>
                                    <td>{fmtPct(row.efg)}</td>
                                    <td>{row.reb}</td>
                                    <td>{row.ast}</td>
                                    <td>{row.fga}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}
                {tab === "shotchart" && (
                  <section className="panel">
                    <div className="export-bar">
                      <button
                        type="button"
                        className="btn primary"
                        disabled={!hasShots}
                        onClick={() => void exportShotChartPdf()}
                      >
                        PDF แผนภาพ
                      </button>
                    </div>
                    <h2>แผนภาพการยิง — {teamMap.get(activeTeamId)}</h2>
                    {!hasShots ? (
                      <p className="muted">ยังไม่มีพิกัดการยิงในแมตช์นี้</p>
                    ) : (
                      <div ref={shotChartRef} className="shotchart-wrap">
                        <ShotChartView shots={shotMarkers} zones={zoneShades} />
                        <div className="shotchart-side">
                          <div className="stat-cards">
                            <div className="stat-card">
                              <span className="stat-label">ยิงทั้งหมด</span>
                              <strong>{shotMarkers.length}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">เข้า</span>
                              <strong>{madeShots}</strong>
                            </div>
                            <div className="stat-card">
                              <span className="stat-label">FG%</span>
                              <strong>
                                {fmtPct(madeShots / shotMarkers.length)}
                              </strong>
                            </div>
                          </div>
                          <p className="muted">
                            ใต้แป้น {distanceSplit.near} · ระยะไกล{" "}
                            {distanceSplit.far}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {tab === "zones" && (
                  <>
                    <section className="panel">
                      <div className="export-bar">
                        <button
                          type="button"
                          className="btn primary"
                          disabled={!hasEvents}
                          onClick={() =>
                            void downloadZonesExcel(
                              `sp-zones-${selectedGame.id.slice(0, 8)}.xlsx`,
                              teamZones,
                              playerZones,
                            )
                          }
                        >
                          Excel
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={!hasEvents}
                          onClick={() =>
                            void downloadZonesPdf(
                              `sp-zones-${selectedGame.id.slice(0, 8)}.pdf`,
                              `โซนการยิง — ${teamMap.get(activeTeamId) ?? "ทีม"}`,
                              teamZones,
                              playerZones,
                            )
                          }
                        >
                          PDF
                        </button>
                      </div>
                      <h2>โซนการยิง — ทีมรวม</h2>
                      <div className="table-scroll">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>โซน</th>
                              <th>FGM</th>
                              <th>FGA</th>
                              <th>FG%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamZones.map((zone) => (
                              <tr key={zone.zone}>
                                <td>{zone.label}</td>
                                <td>{zone.fgm}</td>
                                <td>{zone.fga}</td>
                                <td>{fmtPct(zone.pct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <section className="panel">
                      <h2>โซนการยิง — รายผู้เล่น</h2>
                      <div className="zone-grid">
                        {playerZones.map((player) => (
                          <div key={player.playerId} className="zone-card">
                            <h3>
                              {player.jersey} {player.playerName}
                            </h3>
                            <table className="data-table compact">
                              <tbody>
                                {player.zones
                                  .filter((zone) => zone.fga > 0)
                                  .map((zone) => (
                                    <tr key={zone.zone}>
                                      <td>{zone.label}</td>
                                      <td>
                                        {zone.fgm}/{zone.fga}
                                      </td>
                                      <td>{fmtPct(zone.pct)}</td>
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
              <section className="panel share-panel">
                <div className="share-panel-head">
                  <h2>แชร์นัดนี้</h2>
                  <p className="muted report-note">ลิงก์สาธารณะ · ไม่ต้องล็อกอิน</p>
                </div>
                <div className="public-link-row">
                  <input
                    className="public-link-input"
                    readOnly
                    value={publicUrl}
                    aria-label="ลิงก์สาธารณะ"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      void copyText(publicUrl).then((ok) =>
                        setShareMsg(ok ? "คัดลอกลิงก์แล้ว" : "คัดลอกไม่สำเร็จ"),
                      )
                    }
                  >
                    คัดลอก
                  </button>
                  <a
                    className="btn"
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิด
                  </a>
                </div>
                {shareMsg && <p className="muted">{shareMsg}</p>}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
