import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createCompetition,
  deleteCompetition,
  fetchCompetitions,
  updateCompetition,
} from "../lib/api";
import type { Competition } from "../lib/types";

export function CompetitionsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [editing, setEditing] = useState<Competition | null>(null);
  const [msg, setMsg] = useState("");

  const competitions = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });

  const sorted = useMemo(
    () =>
      [...(competitions.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "th"),
      ),
    [competitions.data],
  );

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setSeason(editing.season ?? "");
  }, [editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("กรอกชื่อการแข่งขัน");
      if (editing) {
        await updateCompetition(editing.id, { name, season });
        return editing.id;
      }
      const row = await createCompetition({ name, season });
      return row.id;
    },
    onSuccess: async () => {
      const wasEdit = !!editing;
      setName("");
      setSeason("");
      setEditing(null);
      setMsg(wasEdit ? "แก้ไขการแข่งขันแล้ว" : "เพิ่มการแข่งขันแล้ว");
      await qc.invalidateQueries({ queryKey: ["competitions"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCompetition(id),
    onSuccess: async () => {
      if (editing) {
        setEditing(null);
        setName("");
        setSeason("");
      }
      setMsg("ลบการแข่งขันแล้ว");
      await qc.invalidateQueries({ queryKey: ["competitions"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>การแข่งขัน</h1>
        <p className="muted">
          เพิ่ม แก้ไข ลบลีก/ทัวร์นาเมนต์ — แล้วเลือกตอน{" "}
          <Link to="/games">สร้างแมตช์</Link>
        </p>
      </header>

      <div className="grid-2">
        <section className="panel">
          <h2>{editing ? "แก้ไขการแข่งขัน" : "เพิ่มการแข่งขัน"}</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
          >
            <label>
              ชื่อการแข่งขัน
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น SP Demo League"
                required
              />
            </label>
            <label>
              ซีซัน
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2026"
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
                    setSeason("");
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
          {competitions.isLoading && <p>โหลด…</p>}
          {competitions.isError && (
            <p className="err">{(competitions.error as Error).message}</p>
          )}
          <div className="table-scroll">
            <table className="data-table sticky-name">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ซีซัน</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.season ?? "—"}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => setEditing(c)}
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
                              `ลบการแข่งขัน?\n\n${c.name}${c.season ? ` (${c.season})` : ""}\n\nลบได้เมื่อยังไม่มีแมตช์อ้างอิง`,
                            )
                          ) {
                            delMut.mutate(c.id);
                          }
                        }}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && !competitions.isLoading && (
                  <tr>
                    <td colSpan={3} className="muted">
                      ยังไม่มีการแข่งขัน — เพิ่มด้านซ้าย
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
