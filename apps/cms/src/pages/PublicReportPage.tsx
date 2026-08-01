import { ShotChartView } from "@sp/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MatchBoxView } from "../components/MatchBoxView";
import {
  fetchGame,
  fetchGameRosters,
  fetchPbp,
  fetchPeriodScores,
  fetchPlayers,
  fetchTeams,
} from "../lib/api";
import {
  buildCoachInsights,
  buildCoachPlayerLines,
  buildTeamTotals,
  buildTeamZones,
  fmtPct,
} from "../lib/coach-reports";
import { buildCmsMatchBoxScore } from "../lib/match-box";
import { buildShotMarkers } from "../lib/stats-reports";
import { gameMatchLabel, gameSideLabel } from "../lib/types";

type Tab = "box" | "insights" | "shotchart";

const TABS: { id: Tab; label: string }[] = [
  { id: "box", label: "ใบสถิตินัด" },
  { id: "insights", label: "สรุปโค้ช" },
  { id: "shotchart", label: "แผนภาพการยิง" },
];

export function PublicReportPage() {
  const { gameId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("box");

  const game = useQuery({
    queryKey: ["public-game", gameId],
    queryFn: () => fetchGame(gameId),
    enabled: !!gameId,
  });
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const pbp = useQuery({
    queryKey: ["pbp", gameId],
    queryFn: () => fetchPbp(gameId),
    enabled: !!gameId && !!game.data,
  });
  const players = useQuery({
    queryKey: ["players-all"],
    queryFn: () => fetchPlayers(),
    enabled: !!game.data,
  });
  const periodScores = useQuery({
    queryKey: ["period-scores", gameId],
    queryFn: () => fetchPeriodScores(gameId),
    enabled: !!gameId && !!game.data,
  });
  const gameRosters = useQuery({
    queryKey: ["game-rosters", gameId],
    queryFn: () => fetchGameRosters(gameId),
    enabled: !!gameId && !!game.data,
  });

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const g = game.data;
  const ourTeamId = g?.our_team_id ?? "";
  const ourName = teamMap.get(ourTeamId) ?? "ทีมเรา";
  const matchLabel = g
    ? gameMatchLabel(ourName, g.opponent_name, g.our_side)
    : "";

  const matchBox = useMemo(() => {
    if (!g || !players.data || !teams.data) return null;
    const homeStarters = (gameRosters.data ?? [])
      .filter((r) => r.team_id === g.home_team_id && r.is_starter)
      .map((r) => r.player_id);
    const awayStarters = (gameRosters.data ?? [])
      .filter((r) => r.team_id === g.away_team_id && r.is_starter)
      .map((r) => r.player_id);
    return buildCmsMatchBoxScore({
      game: g,
      events: pbp.data ?? [],
      players: players.data,
      teams: teams.data,
      periodScores: (periodScores.data ?? []).map((score) => ({
        period: score.period,
        homePoints: score.home_points,
        awayPoints: score.away_points,
      })),
      homeStarters,
      awayStarters,
    });
  }, [g, players.data, teams.data, pbp.data, periodScores.data, gameRosters.data]);

  const playerLines = useMemo(() => {
    if (!pbp.data || !players.data || !ourTeamId) return [];
    return buildCoachPlayerLines(pbp.data, players.data, ourTeamId);
  }, [pbp.data, players.data, ourTeamId]);

  const teamZones = useMemo(() => {
    if (!pbp.data || !ourTeamId) return [];
    return buildTeamZones(pbp.data, ourTeamId);
  }, [pbp.data, ourTeamId]);

  const insights = useMemo(
    () => buildCoachInsights(playerLines, teamZones, ourName),
    [playerLines, teamZones, ourName],
  );

  const teamTotals = useMemo(() => buildTeamTotals(playerLines), [playerLines]);

  const zoneShades = useMemo(() => {
    const find = (zone: "paint" | "mid" | "three") =>
      teamZones.find((z) => z.zone === zone)?.pct ?? null;
    return { paint: find("paint"), mid: find("mid"), three: find("three") };
  }, [teamZones]);

  const shotMarkers = useMemo(() => {
    if (!pbp.data || !ourTeamId) return [];
    return buildShotMarkers(pbp.data, ourTeamId);
  }, [pbp.data, ourTeamId]);

  const hasEvents = (pbp.data?.length ?? 0) > 0;
  const hasBoxData =
    !!matchBox &&
    (hasEvents ||
      matchBox.home.players.length > 0 ||
      matchBox.away.players.length > 0);
  const madeShots = shotMarkers.filter((s) => s.made).length;

  return (
    <div className="public-report">
      <header className="public-report-top">
        <div className="public-report-brand">
          <img src="/sp-logo.png" alt="SP FITNESS" />
          <div>
            <strong>SP FITNESS</strong>
            <span>ใบสถิตินัด · FIBA</span>
          </div>
        </div>
        <Link to="/login" className="btn tiny ghost">
          เข้าสู่ระบบ CMS
        </Link>
      </header>

      <main className="public-report-main">
        {game.isLoading && <p className="muted">กำลังโหลดรายงาน…</p>}
        {game.isError && <p className="err">{(game.error as Error).message}</p>}
        {!game.isLoading && !g && (
          <section className="panel">
            <div className="empty-state">
              <h3>ไม่พบแมตช์นี้</h3>
              <p className="muted">ลิงก์อาจผิด หรือแมตช์ถูกลบแล้ว</p>
            </div>
          </section>
        )}

        {g && (
          <>
            <header className="page-head">
              <h1>{matchLabel}</h1>
              <p className="muted">
                {gameSideLabel(g.our_side)} · {ourName}
                {g.scheduled_at
                  ? ` · ${new Date(g.scheduled_at).toLocaleString("th-TH")}`
                  : ""}
                {` · ${g.status}`}
              </p>
            </header>

            <div className="report-tabs public-tabs">
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

            {pbp.isLoading && <p className="muted">โหลดสถิติ…</p>}
            {!pbp.isLoading && !hasEvents && tab !== "box" && (
              <section className="panel">
                <p className="muted">ยังไม่มีสถิติในแมตช์นี้ — รอซิงก์จาก Courtside</p>
              </section>
            )}

            {tab === "box" && (
              <section className="panel box-score-panel">
                {!hasBoxData ? (
                  <p className="muted">ยังไม่มีใบสถิติ — รอซิงก์จาก Courtside</p>
                ) : (
                  matchBox && <MatchBoxView box={matchBox} />
                )}
              </section>
            )}

            {hasEvents && tab === "insights" && (
              <section className="panel">
                <h2>สรุปสำหรับโค้ช — {ourName}</h2>
                {insights.length === 0 ? (
                  <p className="muted">ยังไม่มีข้อมูลชู้ตพอสำหรับคำแนะนำ</p>
                ) : (
                  <ul className="insight-list">
                    {insights.map((item, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: ordered tips
                      <li key={i} className={`insight insight-${item.level}`}>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}
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

            {hasEvents && tab === "shotchart" && (
              <section className="panel">
                <h2>แผนภาพการยิง — {ourName}</h2>
                {shotMarkers.length === 0 ? (
                  <p className="muted">ยังไม่มีพิกัดการยิง</p>
                ) : (
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
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="public-report-foot muted">
        SP FITNESS · รายงานสาธารณะ · ไม่ต้องล็อกอิน
      </footer>
    </div>
  );
}
