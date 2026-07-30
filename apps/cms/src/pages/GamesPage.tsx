import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createGame,
  fetchCompetitions,
  fetchGames,
  fetchTeams,
  updateGameStatus,
} from "../lib/api";
import { DEFAULT_COMPETITION_ID } from "../lib/types";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GamesPage() {
  const qc = useQueryClient();
  const [competitionId, setCompetitionId] = useState(DEFAULT_COMPETITION_ID);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  );
  const [msg, setMsg] = useState("");

  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const competitions = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });

  const activeCompId =
    competitionId || competitions.data?.[0]?.id || DEFAULT_COMPETITION_ID;

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const recentGames = useMemo(
    () => (games.data ?? []).slice(0, 30),
    [games.data],
  );

  const createMut = useMutation({
    mutationFn: async () => {
      const home = homeTeamId || teams.data?.[0]?.id || "";
      const away =
        awayTeamId ||
        teams.data?.find((t) => t.id !== home)?.id ||
        teams.data?.[1]?.id ||
        "";
      if (!home || !away) throw new Error("เลือกทีมเหย้าและทีมเยือน");
      return createGame({
        competition_id: activeCompId,
        home_team_id: home,
        away_team_id: away,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
    },
    onSuccess: async () => {
      setMsg("สร้างแมตช์แล้ว — Courtside สามารถดึงรายการนี้ได้หลังซิงค์/รีเฟรช");
      await qc.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateGameStatus(id, status),
    onSuccess: async () => {
      setMsg("อัปเดตสถานะแล้ว");
      await qc.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const defaultHome = homeTeamId || teams.data?.[0]?.id || "";
  const defaultAway =
    awayTeamId ||
    teams.data?.find((t) => t.id !== defaultHome)?.id ||
    teams.data?.[1]?.id ||
    "";

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>จัดการแมตช์</h1>
        <p className="muted">
          เพิ่มรายการแข่งขันสำหรับ Courtside และรายงานสรุปย้อนหลัง
        </p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>เพิ่มแมตช์ใหม่</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
          >
            <label>
              การแข่งขัน
              <select
                value={activeCompId}
                onChange={(e) => setCompetitionId(e.target.value)}
              >
                {(competitions.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.season ? ` (${c.season})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ทีมเหย้า
              <select
                value={defaultHome}
                onChange={(e) => setHomeTeamId(e.target.value)}
                required
              >
                {(teams.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ทีมเยือน
              <select
                value={defaultAway}
                onChange={(e) => setAwayTeamId(e.target.value)}
                required
              >
                {(teams.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              วัน–เวลา
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "กำลังสร้าง…" : "สร้างแมตช์"}
            </button>
            {msg && <p className="muted">{msg}</p>}
          </form>
        </section>

        <section className="panel">
          <h2>รายการแมตช์ล่าสุด</h2>
          {games.isLoading && <p>โหลด…</p>}
          {games.isError && (
            <p className="err">{(games.error as Error).message}</p>
          )}
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
                  <tr key={g.id}>
                    <td className="cell-stack">
                      <span className="cell-primary">
                        {teamMap.get(g.home_team_id) ?? "?"} vs{" "}
                        {teamMap.get(g.away_team_id) ?? "?"}
                      </span>
                      <span className="cell-muted">
                        {g.scheduled_at
                          ? new Date(g.scheduled_at).toLocaleString("th-TH")
                          : "ยังไม่กำหนดเวลา"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status-${g.status}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="actions">
                      {g.status === "scheduled" && (
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() =>
                            statusMut.mutate({ id: g.id, status: "live" })
                          }
                        >
                          เริ่ม
                        </button>
                      )}
                      {g.status !== "final" && (
                        <button
                          type="button"
                          className="btn tiny ghost"
                          onClick={() =>
                            statusMut.mutate({ id: g.id, status: "final" })
                          }
                        >
                          จบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {recentGames.length === 0 && !games.isLoading && (
                  <tr>
                    <td colSpan={3} className="muted">
                      ยังไม่มีแมตช์ — สร้างด้านซ้าย
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
