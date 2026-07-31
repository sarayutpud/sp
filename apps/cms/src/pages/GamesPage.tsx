import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createGame,
  fetchCompetitions,
  fetchGameRosters,
  fetchGames,
  fetchPlayers,
  fetchTeams,
  saveGameRoster,
  updateGame,
  updateGameStatus,
} from "../lib/api";
import {
  DEFAULT_COMPETITION_ID,
  type GameRow,
  type OurSide,
  gameMatchLabel,
  gameSideLabel,
  gameStatusLabel,
} from "../lib/types";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GamesPage() {
  const qc = useQueryClient();
  const [competitionId, setCompetitionId] = useState(DEFAULT_COMPETITION_ID);
  const [ourTeamId, setOurTeamId] = useState("");
  const [opponentTeamId, setOpponentTeamId] = useState("");
  const [ourSide, setOurSide] = useState<OurSide>("HOME");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  );
  const [attackSide, setAttackSide] = useState<"LEFT" | "RIGHT">("LEFT");
  const [homeCoach, setHomeCoach] = useState("");
  const [awayCoach, setAwayCoach] = useState("");
  const [crewChief, setCrewChief] = useState("");
  const [umpire, setUmpire] = useState("");
  const [msg, setMsg] = useState("");
  const [rosterGameId, setRosterGameId] = useState<string | null>(null);
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [editOpponentTeamId, setEditOpponentTeamId] = useState("");
  const [editSide, setEditSide] = useState<OurSide>("HOME");
  const [editScheduled, setEditScheduled] = useState("");
  const [editHomeCoach, setEditHomeCoach] = useState("");
  const [editAwayCoach, setEditAwayCoach] = useState("");
  const [editCrewChief, setEditCrewChief] = useState("");
  const [editUmpire, setEditUmpire] = useState("");
  const [dressedIds, setDressedIds] = useState<Set<string>>(new Set());
  const [starterIds, setStarterIds] = useState<Set<string>>(new Set());
  const [rosterTeamScope, setRosterTeamScope] = useState<"our" | "opponent">(
    "our",
  );

  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const competitions = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });

  const activeCompId =
    competitionId || competitions.data?.[0]?.id || DEFAULT_COMPETITION_ID;
  const activeOurTeamId = ourTeamId || teams.data?.[0]?.id || "";

  const rosterGame = games.data?.find((g) => g.id === rosterGameId);
  const editGame = games.data?.find((g) => g.id === editGameId);

  const rosterTeamId = useMemo(() => {
    if (!rosterGame) return "";
    if (rosterTeamScope === "our") return rosterGame.our_team_id;
    return rosterGame.our_side === "HOME"
      ? rosterGame.away_team_id
      : rosterGame.home_team_id;
  }, [rosterGame, rosterTeamScope]);

  const rosterOpponentTeamId = useMemo(() => {
    if (!rosterGame) return "";
    return rosterGame.our_side === "HOME"
      ? rosterGame.away_team_id
      : rosterGame.home_team_id;
  }, [rosterGame]);

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const recentGames = useMemo(
    () => (games.data ?? []).slice(0, 30),
    [games.data],
  );

  const squad = useQuery({
    queryKey: ["players", rosterTeamId],
    queryFn: () => fetchPlayers(rosterTeamId),
    enabled: !!rosterTeamId,
  });

  const gameRoster = useQuery({
    queryKey: ["game-rosters", rosterGameId],
    queryFn: () => fetchGameRosters(rosterGameId!),
    enabled: !!rosterGameId,
  });

  useEffect(() => {
    if (!rosterGameId || !squad.data || !rosterTeamId) return;
    const existing = (gameRoster.data ?? []).filter(
      (r) => r.team_id === rosterTeamId,
    );
    if (existing.length > 0) {
      setDressedIds(new Set(existing.map((r) => r.player_id)));
      setStarterIds(
        new Set(existing.filter((r) => r.is_starter).map((r) => r.player_id)),
      );
    } else if (squad.data.length > 0) {
      setDressedIds(new Set(squad.data.map((p) => p.id)));
      setStarterIds(new Set());
    } else {
      setDressedIds(new Set());
      setStarterIds(new Set());
    }
  }, [rosterGameId, rosterTeamId, squad.data, gameRoster.data]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!activeOurTeamId) throw new Error("เลือกทีมเรา");
      if (!opponentTeamId) throw new Error("เลือกทีมคู่แข่ง");
      return createGame({
        competition_id: activeCompId,
        our_team_id: activeOurTeamId,
        opponent_team_id: opponentTeamId,
        our_side: ourSide,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        home_attack_side: attackSide,
        home_coach: homeCoach,
        away_coach: awayCoach,
        crew_chief: crewChief,
        umpire,
      });
    },
    onSuccess: async () => {
      setMsg("สร้างแมตช์แล้ว — จัดรายชื่อลงแข่งด้านล่าง");
      setOpponentTeamId("");
      setHomeCoach("");
      setAwayCoach("");
      setCrewChief("");
      setUmpire("");
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

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editGameId || !editGame) throw new Error("เลือกแมตช์");
      await updateGame(editGameId, {
        opponent_team_id: editOpponentTeamId,
        our_side: editSide,
        scheduled_at: editScheduled
          ? new Date(editScheduled).toISOString()
          : null,
        our_team_id: editGame.our_team_id,
        home_coach: editHomeCoach,
        away_coach: editAwayCoach,
        crew_chief: editCrewChief,
        umpire: editUmpire,
      });
    },
    onSuccess: async () => {
      setMsg("แก้ไขแมตช์แล้ว");
      setEditGameId(null);
      await qc.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const rosterMut = useMutation({
    mutationFn: async () => {
      if (!rosterGameId || !rosterGame || !rosterTeamId) return;
      const dressed = [...dressedIds];
      const starters = [...starterIds].filter((id) => dressedIds.has(id));
      if (starters.length > 5) throw new Error("ตัวจริงได้ไม่เกิน 5 คน");
      return saveGameRoster(rosterGameId, rosterTeamId, dressed, starters);
    },
    onSuccess: async () => {
      setMsg(
        rosterTeamScope === "our"
          ? "บันทึกรายชื่อทีมเราแล้ว — สลับไปจัดทีมคู่แข่งได้"
          : "บันทึกรายชื่อทีมคู่แข่งแล้ว — Courtside จะดึงหลังซิงก์",
      );
      await qc.invalidateQueries({ queryKey: ["game-rosters", rosterGameId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const toggleDressed = (playerId: string) => {
    setDressedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        setStarterIds((s) => {
          const ns = new Set(s);
          ns.delete(playerId);
          return ns;
        });
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const toggleStarter = (playerId: string) => {
    if (!dressedIds.has(playerId)) return;
    setStarterIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < 5) {
        next.add(playerId);
      }
      return next;
    });
  };

  const starterCount = [...starterIds].filter((id) =>
    dressedIds.has(id),
  ).length;

  function openRoster(game: GameRow) {
    setRosterGameId(game.id);
    setRosterTeamScope("our");
    setEditGameId(null);
    setMsg("");
  }

  function openEdit(game: GameRow) {
    setEditGameId(game.id);
    setRosterGameId(null);
    setEditOpponentTeamId(
      game.our_side === "HOME" ? game.away_team_id : game.home_team_id,
    );
    setEditSide(game.our_side);
    setEditHomeCoach(game.home_coach ?? "");
    setEditAwayCoach(game.away_coach ?? "");
    setEditCrewChief(game.crew_chief ?? "");
    setEditUmpire(game.umpire ?? "");
    setEditScheduled(
      game.scheduled_at
        ? toLocalInputValue(new Date(game.scheduled_at))
        : "",
    );
    setMsg("");
  }

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>แมตช์ของเรา</h1>
        <p className="muted">
          สร้างแมตช์ แล้วจัดรายชื่อลงแข่งให้ Courtside
        </p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>สร้างแมตช์ใหม่</h2>
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
              ทีมเรา
              <select
                value={activeOurTeamId}
                onChange={(e) => setOurTeamId(e.target.value)}
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
              ทีมคู่แข่ง
              <select
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
                required
              >
                <option value="">— เลือกจากรายการทีม —</option>
                {(teams.data ?? [])
                  .filter((t) => t.id !== activeOurTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="muted report-note">
              คู่แข่งต้องเป็นทีมในระบบ — เพิ่มทีม/ผู้เล่นก่อนถ้ายังไม่มีในรายการ
            </p>
            <fieldset className="side-fieldset">
              <legend>ฝั่งเรา</legend>
              <div className="segment" role="group" aria-label="ฝั่งเรา">
                <button
                  type="button"
                  className={ourSide === "HOME" ? "active" : ""}
                  onClick={() => setOurSide("HOME")}
                >
                  เหย้า
                </button>
                <button
                  type="button"
                  className={ourSide === "AWAY" ? "active" : ""}
                  onClick={() => setOurSide("AWAY")}
                >
                  เยือน
                </button>
              </div>
            </fieldset>
            <label>
              วัน–เวลา
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            <label>
              ตะกร้าที่ทีมเหย้าบุกควอเตอร์ 1
              <select
                value={attackSide}
                onChange={(e) =>
                  setAttackSide(e.target.value as "LEFT" | "RIGHT")
                }
              >
                <option value="LEFT">ซ้าย</option>
                <option value="RIGHT">ขวา</option>
              </select>
            </label>
            <label>
              โค้ชทีมเหย้า
              <input
                value={homeCoach}
                onChange={(e) => setHomeCoach(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </label>
            <label>
              โค้ชทีมเยือน
              <input
                value={awayCoach}
                onChange={(e) => setAwayCoach(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </label>
            <label>
              Crew Chief
              <input
                value={crewChief}
                onChange={(e) => setCrewChief(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </label>
            <label>
              Umpire
              <input
                value={umpire}
                onChange={(e) => setUmpire(e.target.value)}
                placeholder="ไม่บังคับ"
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "กำลังสร้าง…" : "สร้างแมตช์"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>รายการแมตช์</h2>
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
                {recentGames.map((g) => {
                  const teamName =
                    teamMap.get(g.our_team_id) ?? g.our_team_id.slice(0, 8);
                  return (
                    <tr
                      key={g.id}
                      className={rosterGameId === g.id ? "selected" : ""}
                    >
                      <td className="cell-stack">
                        <span className="cell-primary">
                          {gameMatchLabel(
                            teamName,
                            g.opponent_name,
                            g.our_side,
                          )}
                        </span>
                        <span className="cell-muted">
                          <span className="side-chip">
                            {gameSideLabel(g.our_side)}
                          </span>
                          {" · "}
                          {g.scheduled_at
                            ? new Date(g.scheduled_at).toLocaleString("th-TH")
                            : "ยังไม่กำหนดเวลา"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge status-${g.status}`}>
                          {gameStatusLabel(g.status)}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn tiny primary"
                          onClick={() => openRoster(g)}
                        >
                          จัดรายชื่อ
                        </button>
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() => openEdit(g)}
                        >
                          แก้ไข
                        </button>
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
                            className="btn tiny"
                            onClick={() =>
                              statusMut.mutate({ id: g.id, status: "final" })
                            }
                          >
                            จบ
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {msg && <p className="muted">{msg}</p>}

      {editGame && (
        <section className="panel">
          <h2>แก้ไขแมตช์</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              editMut.mutate();
            }}
          >
            <label>
              ทีมคู่แข่ง
              <select
                value={editOpponentTeamId}
                onChange={(e) => setEditOpponentTeamId(e.target.value)}
                required
              >
                <option value="">— เลือกทีม —</option>
                {(teams.data ?? [])
                  .filter((team) => team.id !== editGame.our_team_id)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="side-fieldset">
              <legend>ฝั่งเรา</legend>
              <div className="segment" role="group" aria-label="ฝั่งเรา">
                <button
                  type="button"
                  className={editSide === "HOME" ? "active" : ""}
                  onClick={() => setEditSide("HOME")}
                >
                  เหย้า
                </button>
                <button
                  type="button"
                  className={editSide === "AWAY" ? "active" : ""}
                  onClick={() => setEditSide("AWAY")}
                >
                  เยือน
                </button>
              </div>
            </fieldset>
            <label>
              วัน–เวลา
              <input
                type="datetime-local"
                value={editScheduled}
                onChange={(e) => setEditScheduled(e.target.value)}
              />
            </label>
            <label>
              โค้ชทีมเหย้า
              <input
                value={editHomeCoach}
                onChange={(e) => setEditHomeCoach(e.target.value)}
              />
            </label>
            <label>
              โค้ชทีมเยือน
              <input
                value={editAwayCoach}
                onChange={(e) => setEditAwayCoach(e.target.value)}
              />
            </label>
            <label>
              Crew Chief
              <input
                value={editCrewChief}
                onChange={(e) => setEditCrewChief(e.target.value)}
              />
            </label>
            <label>
              Umpire
              <input
                value={editUmpire}
                onChange={(e) => setEditUmpire(e.target.value)}
              />
            </label>
            <div className="row">
              <button
                type="submit"
                className="btn primary"
                disabled={editMut.isPending}
              >
                บันทึกแมตช์
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setEditGameId(null)}
              >
                ปิด
              </button>
            </div>
          </form>
        </section>
      )}

      {rosterGame && (
        <section className="panel">
          <h2>
            รายชื่อลงแข่งวันนี้ —{" "}
            {gameMatchLabel(
              teamMap.get(rosterGame.our_team_id) ?? "?",
              rosterGame.opponent_name,
              rosterGame.our_side,
            )}
          </h2>
          <p className="muted report-note">
            จัดรายชื่อทั้งสองทีม — ติ๊กผู้เล่นที่ลงแข่ง · ตัวจริงไม่เกิน 5 คนต่อทีม
          </p>
          <div className="segment" role="group" aria-label="ทีมที่จัดรายชื่อ">
            <button
              type="button"
              className={rosterTeamScope === "our" ? "active" : ""}
              onClick={() => setRosterTeamScope("our")}
            >
              ทีมเรา
              {teamMap.get(rosterGame.our_team_id)
                ? ` · ${teamMap.get(rosterGame.our_team_id)}`
                : ""}
            </button>
            <button
              type="button"
              className={rosterTeamScope === "opponent" ? "active" : ""}
              onClick={() => setRosterTeamScope("opponent")}
            >
              คู่แข่ง
              {teamMap.get(rosterOpponentTeamId)
                ? ` · ${teamMap.get(rosterOpponentTeamId)}`
                : ""}
            </button>
          </div>

          {squad.isLoading && <p>โหลดผู้เล่น…</p>}
          {squad.data?.length === 0 && !squad.isLoading && (
            <p className="muted">
              ยังไม่มีผู้เล่นในทีมนี้ —{" "}
              <Link to="/players">เพิ่มผู้เล่นก่อน</Link>
            </p>
          )}

          {squad.data && squad.data.length > 0 && (
            <>
              <p className="muted">
                ตัวจริง: <strong>{starterCount}/5</strong> · ลงแข่ง:{" "}
                {dressedIds.size} คน
                {rosterTeamScope === "opponent" ? " (คู่แข่ง)" : " (ทีมเรา)"}
              </p>
              <div className="table-scroll">
                <table className="data-table wrap-cells">
                  <thead>
                    <tr>
                      <th>ลงแข่ง</th>
                      <th>เบอร์</th>
                      <th>ชื่อ</th>
                      <th>ตัวจริง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squad.data.map((p) => {
                      const dressed = dressedIds.has(p.id);
                      const starter = starterIds.has(p.id) && dressed;
                      return (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={dressed}
                              onChange={() => toggleDressed(p.id)}
                              aria-label={`ลงแข่ง ${p.display_name}`}
                            />
                          </td>
                          <td>{p.jersey_number ?? "—"}</td>
                          <td>{p.display_name}</td>
                          <td>
                            <button
                              type="button"
                              className={
                                starter ? "btn tiny primary" : "btn tiny"
                              }
                              disabled={!dressed}
                              onClick={() => toggleStarter(p.id)}
                            >
                              {starter ? "ตัวจริง ✓" : "ตัวจริง"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ marginTop: "0.85rem" }}>
                <button
                  type="button"
                  className="btn primary"
                  disabled={rosterMut.isPending || dressedIds.size === 0}
                  onClick={() => rosterMut.mutate()}
                >
                  {rosterMut.isPending ? "กำลังบันทึก…" : "บันทึกรายชื่อ"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setRosterGameId(null)}
                >
                  ปิด
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
