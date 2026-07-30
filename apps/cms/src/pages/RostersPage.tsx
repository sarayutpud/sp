import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  addToRoster,
  fetchCompetitions,
  fetchPlayers,
  fetchRosters,
  fetchTeams,
  removeFromRoster,
} from "../lib/api";
import { DEFAULT_COMPETITION_ID } from "../lib/types";

export function RostersPage() {
  const qc = useQueryClient();
  const [competitionId, setCompetitionId] = useState(DEFAULT_COMPETITION_ID);
  const [teamId, setTeamId] = useState("");
  const [msg, setMsg] = useState("");

  const competitions = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });
  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const activeCompId =
    competitionId || competitions.data?.[0]?.id || DEFAULT_COMPETITION_ID;
  const activeTeamId = teamId || teams.data?.[0]?.id || "";

  const roster = useQuery({
    queryKey: ["rosters", activeCompId, activeTeamId],
    queryFn: () => fetchRosters(activeCompId, activeTeamId),
    enabled: !!activeCompId && !!activeTeamId,
  });

  const squad = useQuery({
    queryKey: ["players", activeTeamId],
    queryFn: () => fetchPlayers(activeTeamId),
    enabled: !!activeTeamId,
  });

  const rosterPlayerIds = useMemo(
    () => new Set((roster.data ?? []).map((r) => r.player_id)),
    [roster.data],
  );

  const available = useMemo(
    () => (squad.data ?? []).filter((p) => !rosterPlayerIds.has(p.id)),
    [squad.data, rosterPlayerIds],
  );

  const rosterPlayers = useMemo(() => {
    const byId = new Map((squad.data ?? []).map((p) => [p.id, p]));
    return (roster.data ?? [])
      .map((r) => {
        const p = byId.get(r.player_id);
        return p
          ? { rosterId: r.id, ...p, jersey_number: r.jersey_number ?? p.jersey_number }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [roster.data, squad.data]);

  const addMut = useMutation({
    mutationFn: addToRoster,
    onSuccess: async () => {
      setMsg("เพิ่มในรายชื่อแข่งขันแล้ว");
      await qc.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const removeMut = useMutation({
    mutationFn: removeFromRoster,
    onSuccess: async () => {
      setMsg("นำออกจากรายชื่อแล้ว");
      await qc.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>จัดสรรรายชื่อ</h1>
        <p className="muted">
          กำหนดผู้เล่นที่ลงแข่งในแต่ละรายการ — Courtside จะดึงรายชื่อนี้ไป sync
        </p>
      </header>

      <div className="toolbar">
        <label className="field-inline">
          รายการแข่งขัน
          <select
            value={activeCompId}
            onChange={(e) => setCompetitionId(e.target.value)}
          >
            {(competitions.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.season ? `(${c.season})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          ทีม
          <select value={activeTeamId} onChange={(e) => setTeamId(e.target.value)}>
            {(teams.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {msg && <p className="muted">{msg}</p>}

      <div className="grid-2">
        <section className="panel">
          <h2>รายชื่อลงแข่ง ({rosterPlayers.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>เบอร์</th>
                <th>ชื่อ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rosterPlayers.map((p) => (
                <tr key={p.rosterId}>
                  <td>{p.jersey_number ?? "—"}</td>
                  <td>{p.display_name}</td>
                  <td>
                    <button
                      type="button"
                      className="btn tiny danger"
                      onClick={() => removeMut.mutate(p.rosterId)}
                    >
                      นำออก
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>ผู้เล่นในทีม (ยังไม่ได้ใส่รายชื่อ)</h2>
          {available.length === 0 && (
            <p className="muted">ทุกคนอยู่ในรายชื่อแล้ว</p>
          )}
          <ul className="pick-list">
            {available.map((p) => (
              <li key={p.id}>
                <span>
                  {p.jersey_number} {p.display_name}
                </span>
                <button
                  type="button"
                  className="btn tiny primary"
                  onClick={() =>
                    addMut.mutate({
                      competition_id: activeCompId,
                      team_id: activeTeamId,
                      player_id: p.id,
                      jersey_number: p.jersey_number ?? "",
                    })
                  }
                >
                  เพิ่ม
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
