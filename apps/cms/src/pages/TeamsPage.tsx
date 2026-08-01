import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTeam,
  deleteTeam,
  fetchTeams,
  updateTeam,
} from "../lib/api";
import type { Team } from "../lib/types";

export function TeamsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [editing, setEditing] = useState<Team | null>(null);
  const [msg, setMsg] = useState("");

  const teams = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const sorted = useMemo(
    () =>
      [...(teams.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "th")),
    [teams.data],
  );

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setShortName(editing.short_name ?? "");
  }, [editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("กรอกชื่อทีม");
      if (editing) {
        await updateTeam(editing.id, {
          name,
          short_name: shortName,
        });
        return editing.id;
      }
      const row = await createTeam({ name, short_name: shortName });
      return row.id;
    },
    onSuccess: async () => {
      const wasEdit = !!editing;
      setName("");
      setShortName("");
      setEditing(null);
      setMsg(wasEdit ? "แก้ไขทีมแล้ว" : "เพิ่มทีมแล้ว");
      await qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: async () => {
      if (editing) {
        setEditing(null);
        setName("");
        setShortName("");
      }
      setMsg("ลบทีมแล้ว");
      await qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>ทีม</h1>
        <p className="muted">
          เพิ่ม แก้ไข ลบทีม — แล้วไปเพิ่มผู้เล่นที่{" "}
          <Link to="/players">ผู้เล่น</Link> หรือเลือกตอน{" "}
          <Link to="/games">สร้างแมตช์</Link>
        </p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>{editing ? "แก้ไขทีม" : "เพิ่มทีม"}</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
          >
            <label>
              ชื่อทีม
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น SP Fitness"
                required
              />
            </label>
            <label>
              ชื่อสั้น
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="เช่น SPF"
              />
            </label>
            <div className="row">
              <button
                type="submit"
                className="btn primary"
                disabled={saveMut.isPending}
              >
                {editing
                  ? saveMut.isPending
                    ? "กำลังบันทึก…"
                    : "บันทึก"
                  : saveMut.isPending
                    ? "กำลังเพิ่ม…"
                    : "เพิ่ม"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setShortName("");
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
          <h2>รายการ ({sorted.length})</h2>
          {teams.isLoading && <p>โหลด…</p>}
          {teams.isError && (
            <p className="err">{(teams.error as Error).message}</p>
          )}
          <div className="table-scroll">
            <table className="data-table sticky-name">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>สั้น</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.short_name ?? "—"}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => setEditing(t)}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="btn tiny danger"
                        disabled={delMut.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `ลบทีม?\n\n${t.name}\n\nลบได้เมื่อยังไม่มีผู้เล่น/แมตช์อ้างอิง`,
                            )
                          ) {
                            delMut.mutate(t.id);
                          }
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && !teams.isLoading && (
                  <tr>
                    <td colSpan={3} className="muted">
                      ยังไม่มีทีม — เพิ่มด้านซ้าย
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
