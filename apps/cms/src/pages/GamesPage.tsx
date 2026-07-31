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
} from "../lib/types";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GamesPage() {
  const qc = useQueryClient();
  const [competitionId, setCompetitionId] = useState(DEFAULT_COMPETITION_ID);
  const [ourTeamId, setOurTeamId] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [ourSide, setOurSide] = useState<OurSide>("HOME");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  );
  const [attackSide, setAttackSide] = useState<"LEFT" | "RIGHT">("LEFT");
  const [msg, setMsg] = useState("");
  const [rosterGameId, setRosterGameId] = useState<string | null>(null);
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [editOpponent, setEditOpponent] = useState("");
  const [editSide, setEditSide] = useState<OurSide>("HOME");
  const [editScheduled, setEditScheduled] = useState("");
  const [dressedIds, setDressedIds] = useState<Set<string>>(new Set());
  const [starterIds, setStarterIds] = useState<Set<string>>(new Set());

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

  const teamMap = useMemo(
    () => new Map((teams.data ?? []).map((t) => [t.id, t.name])),
    [teams.data],
  );

  const recentGames = useMemo(
    () => (games.data ?? []).slice(0, 30),
    [games.data],
  );

  const squad = useQuery({
    queryKey: ["players", rosterGame?.our_team_id],
    queryFn: () => fetchPlayers(rosterGame!.our_team_id),
    enabled: !!rosterGame?.our_team_id,
  });

  const gameRoster = useQuery({
    queryKey: ["game-rosters", rosterGameId],
    queryFn: () => fetchGameRosters(rosterGameId!),
    enabled: !!rosterGameId,
  });

  useEffect(() => {
    if (!rosterGameId || !squad.data) return;
    const existing = gameRoster.data;
    if (existing && existing.length > 0) {
      setDressedIds(new Set(existing.map((r) => r.player_id)));
      setStarterIds(
        new Set(
          existing.filter((r) => r.is_starter).map((r) => r.player_id),
        ),
      );
    } else if (squad.data.length > 0) {
      setDressedIds(new Set(squad.data.map((p) => p.id)));
      setStarterIds(new Set());
    } else {
      setDressedIds(new Set());
      setStarterIds(new Set());
    }
  }, [rosterGameId, squad.data, gameRoster.data]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!activeOurTeamId) throw new Error("เลือกทีมเรา");
      return createGame({
        competition_id: activeCompId,
        our_team_id: activeOurTeamId,
        opponent_name: opponentName,
        our_side: ourSide,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        home_attack_side: attackSide,
      });
    },
    onSuccess: async () => {
      setMsg("สร้างแมตช์แล้ว — จัดรายชื่อลงแข่งด้านล่าง");
      setOpponentName("");
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
        opponent_name: editOpponent,
        our_side: editSide,
        scheduled_at: editScheduled
          ? new Date(editScheduled).toISOString()
          : null,
        our_team_id: editGame.our_team_id,
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
      if (!rosterGameId) return;
      const dressed = [...dressedIds];
      const starters = [...starterIds].filter((id) => dressedIds.has(id));
      if (starters.length > 5) throw new Error("ตัวจริงได้ไม่เกิน 5 คน");
      return saveGameRoster(rosterGameId, dressed, starters);
    },
    onSuccess: async () => {
      setMsg("บันทึกรายชื่อลงแข่งแล้ว — Courtside จะดึงหลังซิงก์");
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
    setEditGameId(null);
    setMsg("");
  }

  function openEdit(game: GameRow) {
    setEditGameId(game.id);
    setRosterGameId(null);
    setEditOpponent(game.opponent_name);
    setEditSide(game.our_side);
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
              ชื่อคู่แข่ง
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="เช่น ทีม ABC"
                required
              />
            </label>
            <fieldset className="side-fieldset">
              <legend>ฝั่งเรา</legend>
              <div className="row">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="our_side"
                    value="HOME"
                    checked={ourSide === "HOME"}
                    onChange={() => setOurSide("HOME")}
                  />
                  เหย้า
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="our_side"
                    value="AWAY"
                    checked={ourSide === "AWAY"}
                    onChange={() => setOurSide("AWAY")}
                  />
                  เยือน
                </label>
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
                          {g.status}
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
              ชื่อคู่แข่ง
              <input
                value={editOpponent}
                onChange={(e) => setEditOpponent(e.target.value)}
                required
              />
            </label>
            <fieldset className="side-fieldset">
              <legend>ฝั่งเรา</legend>
              <div className="row">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="edit_side"
                    checked={editSide === "HOME"}
                    onChange={() => setEditSide("HOME")}
                  />
                  เหย้า
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="edit_side"
                    checked={editSide === "AWAY"}
                    onChange={() => setEditSide("AWAY")}
                  />
                  เยือน
                </label>
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
            ติ๊กผู้เล่นที่ลงแข่ง · เลือกตัวจริง 5 คน · คนที่ไม่ใช่ตัวจริง =
            ตัวสำรองในแอป Courtside
          </p>

          {squad.isLoading && <p>โหลดผู้เล่น…</p>}
          {squad.data?.length === 0 && !squad.isLoading && (
            <p className="muted">
              ยังไม่มีผู้เล่นในทีม —{" "}
              <Link to="/players">เพิ่มผู้เล่นก่อน</Link>
            </p>
          )}

          {squad.data && squad.data.length > 0 && (
            <>
              <p className="muted">
                ตัวจริง: <strong>{starterCount}/5</strong> · ลงแข่ง:{" "}
                {dressedIds.size} คน
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
