import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGames, fetchPbp, fetchPlayers, fetchTeams } from "../lib/api";
import { mergeSeasonLines } from "../lib/coverage";
import { buildFullBoxScore } from "../lib/stats-reports";

type Props = {
  /** When true, omit outer page chrome (used inside Reports hub) */
  embedded?: boolean;
};

export function SeasonReportPage({ embedded = false }: Props) {
  const [teamId, setTeamId] = useState("");
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const players = useQuery({
    queryKey: ["players-all"],
    queryFn: () => fetchPlayers(),
  });

  const activeTeamId = teamId || teams.data?.[0]?.id || "";

  const teamGames = useMemo(
    () =>
      (games.data ?? []).filter((g) => g.our_team_id === activeTeamId),
    [games.data, activeTeamId],
  );

  const pbpQueries = useQueries({
    queries: teamGames.map((g) => ({
      queryKey: ["pbp", g.id],
      queryFn: () => fetchPbp(g.id),
      enabled: !!activeTeamId && teamGames.length > 0,
    })),
  });

  const seasonLines = useMemo(() => {
    if (!players.data) return [];
    const boxes = pbpQueries
      .filter((q) => q.data)
      .map((q) =>
        buildFullBoxScore(q.data ?? [], players.data!, activeTeamId),
      );
    return mergeSeasonLines(boxes);
  }, [pbpQueries, players.data, activeTeamId]);

  const loading = pbpQueries.some((q) => q.isLoading);

  const body = (
    <>
      <div className="toolbar">
        <label className="field-inline">
          ทีม
          <select
            value={activeTeamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {(teams.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">{teamGames.length} แมตช์</span>
      </div>

      <section className="panel">
        <h2>สถิติรวมฤดูกาล</h2>
        {loading && <p>โหลด…</p>}
        {!loading && seasonLines.length === 0 && (
          <div className="empty-state">
            <h3>ยังไม่มีสถิติฤดูกาล</h3>
            <ol className="empty-steps">
              <li>สร้างแมตช์ในเมนูแมตช์</li>
              <li>เปิด Courtside บันทึกสถิติทีมเรา</li>
              <li>กดซิงก์ แล้วกลับมารีเฟรชหน้านี้</li>
            </ol>
            <Link to="/games" className="btn primary">
              ไปสร้างแมตช์
            </Link>
          </div>
        )}
        {seasonLines.length > 0 && (
          <div className="table-scroll">
            <table className="data-table sticky-name mobile-priority">
              <thead>
                <tr>
                  <th>ผู้เล่น</th>
                  <th>GP</th>
                  <th>PTS</th>
                  <th>FG</th>
                  <th className="hide-sm">3PT</th>
                  <th className="hide-sm">FT</th>
                  <th>REB</th>
                  <th className="hide-sm">AST</th>
                  <th className="hide-sm">STL</th>
                  <th className="hide-sm">BLK</th>
                  <th className="hide-sm">TO</th>
                  <th className="hide-sm">PF</th>
                </tr>
              </thead>
              <tbody>
                {seasonLines.map((l) => (
                  <tr key={l.playerId}>
                    <td>
                      {l.jersey} {l.playerName}
                    </td>
                    <td>{l.games}</td>
                    <td>{l.pts}</td>
                    <td>
                      {l.fgm}/{l.fga}
                    </td>
                    <td className="hide-sm">
                      {l.tpm}/{l.tpa}
                    </td>
                    <td className="hide-sm">
                      {l.ftm}/{l.fta}
                    </td>
                    <td>{l.reb}</td>
                    <td className="hide-sm">{l.ast}</td>
                    <td className="hide-sm">{l.stl}</td>
                    <td className="hide-sm">{l.blk}</td>
                    <td className="hide-sm">{l.tov}</td>
                    <td className="hide-sm">{l.pf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  if (embedded) return body;

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>รายงานหลายแมตช์</h1>
        <p className="muted">รวมสถิติผู้เล่นทีมเราจากทุกแมตช์</p>
      </header>
      {body}
    </div>
  );
}
