import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  createPlayer,
  deletePlayer,
  fetchPlayers,
  fetchTeams,
  updatePlayer,
  updateTeam,
} from "../lib/api";
import type { Player } from "../lib/types";

export function PlayersPage() {
  const qc = useQueryClient();
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [editing, setEditing] = useState<Player | null>(null);
  const [msg, setMsg] = useState("");
  const [teamNameEdit, setTeamNameEdit] = useState("");
  const [teamShortEdit, setTeamShortEdit] = useState("");

  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const activeTeamId = teamId || teams.data?.[0]?.id || "";

  const players = useQuery({
    queryKey: ["players", activeTeamId],
    queryFn: () => fetchPlayers(activeTeamId),
    enabled: !!activeTeamId,
  });

  const activeTeam = useMemo(
    () => teams.data?.find((t) => t.id === activeTeamId),
    [teams.data, activeTeamId],
  );
  const teamName = activeTeam?.name ?? "";

  useEffect(() => {
    if (!activeTeam) return;
    setTeamNameEdit(activeTeam.name);
    setTeamShortEdit(activeTeam.short_name ?? "");
  }, [activeTeam]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!activeTeamId || !name.trim()) throw new Error("กรอกชื่อผู้เล่น");
      if (editing) {
        await updatePlayer(editing.id, {
          display_name: name.trim(),
          jersey_number: jersey.trim(),
        });
      } else {
        await createPlayer({
          team_id: activeTeamId,
          display_name: name.trim(),
          jersey_number: jersey.trim(),
        });
      }
    },
    onSuccess: async () => {
      setName("");
      setJersey("");
      setEditing(null);
      setMsg("บันทึกแล้ว");
      await qc.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const teamMut = useMutation({
    mutationFn: async () => {
      if (!activeTeamId || !teamNameEdit.trim()) throw new Error("กรอกชื่อทีม");
      await updateTeam(activeTeamId, {
        name: teamNameEdit,
        short_name: teamShortEdit,
      });
    },
    onSuccess: async () => {
      setMsg("บันทึกชื่อทีมแล้ว");
      await qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const delMut = useMutation({
    mutationFn: deletePlayer,
    onSuccess: async () => {
      setMsg("ลบแล้ว");
      await qc.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>จัดการผู้เล่น</h1>
        <p className="muted">เพิ่ม แก้ไข ลบผู้เล่น และแก้ชื่อทีมเรา</p>
      </header>

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
      </div>

      <section className="panel">
        <h2>ชื่อทีมเรา</h2>
        <form
          className="stack team-edit-row"
          onSubmit={(e) => {
            e.preventDefault();
            teamMut.mutate();
          }}
        >
          <label>
            ชื่อทีม
            <input
              value={teamNameEdit}
              onChange={(e) => setTeamNameEdit(e.target.value)}
              required
            />
          </label>
          <label>
            ชื่อสั้น
            <input
              value={teamShortEdit}
              onChange={(e) => setTeamShortEdit(e.target.value)}
              placeholder="เช่น SPF"
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={teamMut.isPending || !activeTeamId}
          >
            บันทึกชื่อทีม
          </button>
        </form>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>
            {editing ? "แก้ไขผู้เล่น" : "เพิ่มผู้เล่น"} — {teamName}
          </h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
          >
            <label>
              เบอร์
              <input
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
                placeholder="11"
              />
            </label>
            <label>
              ชื่อ
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อผู้เล่น"
                required
              />
            </label>
            <div className="row">
              <button
                type="submit"
                className="btn primary"
                disabled={saveMut.isPending}
              >
                {editing ? "บันทึก" : "เพิ่ม"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setJersey("");
                  }}
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
          {msg && <p className="muted">{msg}</p>}
        </section>

        <section className="panel">
          <h2>รายชื่อ ({players.data?.length ?? 0})</h2>
          {players.isLoading && <p>โหลด…</p>}
          {players.isError && (
            <p className="err">{(players.error as Error).message}</p>
          )}
          <div className="table-scroll">
            <table className="data-table sticky-name">
              <thead>
                <tr>
                  <th>เบอร์</th>
                  <th>ชื่อ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(players.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.jersey_number ?? "—"}</td>
                    <td>{p.display_name}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => {
                          setEditing(p);
                          setName(p.display_name);
                          setJersey(p.jersey_number ?? "");
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="btn tiny danger"
                        onClick={() => {
                          if (window.confirm(`ลบ ${p.display_name}?`)) {
                            delMut.mutate(p.id);
                          }
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
