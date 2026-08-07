import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchWipeSummary,
  importPlayersFromRows,
  wipeAllTeamsPlayersAndGames,
  type ImportPlayerRow,
  type WipeSummary,
} from "../lib/api";

const TEMPLATE_HEADERS = ["เบอร์", "ชื่อ", "ทีม"] as const;
const WIPE_CONFIRM_PHRASE = "ล้างระบบ";

type PreviewRow = ImportPlayerRow & { line: number; error?: string };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function mapHeaders(headers: string[]): {
  jersey?: number;
  name?: number;
  team?: number;
} {
  const map: { jersey?: number; name?: number; team?: number } = {};
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (
      n === "เบอร์" ||
      n === "jersey" ||
      n === "number" ||
      n === "#" ||
      n === "no" ||
      n === "jersey_number"
    ) {
      map.jersey = i;
    } else if (
      n === "ชื่อ" ||
      n === "name" ||
      n === "player" ||
      n === "display_name" ||
      n === "ชื่อผู้เล่น"
    ) {
      map.name = i;
    } else if (n === "ทีม" || n === "team" || n === "team_name") {
      map.team = i;
    }
  });
  return map;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // skip
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function rowsFromGrid(grid: string[][]): PreviewRow[] {
  if (grid.length === 0) return [];
  const header = grid[0]!;
  const cols = mapHeaders(header);
  const hasHeader =
    cols.jersey != null && cols.name != null && cols.team != null;
  const start = hasHeader ? 1 : 0;
  const jerseyIdx = hasHeader ? cols.jersey! : 0;
  const nameIdx = hasHeader ? cols.name! : 1;
  const teamIdx = hasHeader ? cols.team! : 2;

  const out: PreviewRow[] = [];
  for (let i = start; i < grid.length; i++) {
    const cells = grid[i]!;
    const jersey = String(cells[jerseyIdx] ?? "").trim();
    const name = String(cells[nameIdx] ?? "").trim();
    const team = String(cells[teamIdx] ?? "").trim();
    const line = i + 1;
    if (!jersey && !name && !team) continue;
    let error: string | undefined;
    if (!jersey || !name || !team) {
      error = "ต้องมีครบ เบอร์ / ชื่อ / ทีม";
    }
    out.push({ line, jersey, name, team, error });
  }
  return out;
}

async function parseWorkbook(file: File): Promise<PreviewRow[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = await file.text();
    return rowsFromGrid(parseCsv(text));
  }
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as Array<string | number | null | undefined>;
    const cells = values.slice(1).map((v) => String(v ?? "").trim());
    grid.push(cells);
  });
  return rowsFromGrid(grid);
}

async function downloadTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("players");
  ws.addRow([...TEMPLATE_HEADERS]);
  ws.addRow(["4", "สมชาย ใจดี", "SP FITNESS"]);
  ws.addRow(["7", "วิชัย เร็วแรง", "คู่แข่ง A"]);
  ws.getRow(1).font = { bold: true };
  ws.columns = [{ width: 10 }, { width: 24 }, { width: 20 }];
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sp-players-import-template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPlayersPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const [wipePhrase, setWipePhrase] = useState("");
  const [wipeSummary, setWipeSummary] = useState<WipeSummary | null>(null);

  const wipeCounts = useQuery({
    queryKey: ["wipe-summary"],
    queryFn: fetchWipeSummary,
  });

  const validRows = useMemo(
    () => preview.filter((r) => !r.error),
    [preview],
  );
  const invalidCount = preview.length - validRows.length;

  const importMut = useMutation({
    mutationFn: () => importPlayersFromRows(validRows),
    onSuccess: async (res) => {
      setMsg(
        `นำเข้าแล้ว — ทีมใหม่ ${res.teamsCreated} · ผู้เล่นใหม่ ${res.playersCreated} · อัปเดต ${res.playersUpdated} · ข้าม ${res.skipped}`,
      );
      setPreview([]);
      setFileName("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["teams"] }),
        qc.invalidateQueries({ queryKey: ["players"] }),
        qc.invalidateQueries({ queryKey: ["wipe-summary"] }),
      ]);
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const wipeMut = useMutation({
    mutationFn: wipeAllTeamsPlayersAndGames,
    onSuccess: async (summary) => {
      setWipeSummary(summary);
      setWipeStep(0);
      setWipePhrase("");
      setMsg(
        `ล้างระบบแล้ว — แมตช์ ${summary.games} · ผู้เล่น ${summary.players} · ทีม ${summary.teams}`,
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["teams"] }),
        qc.invalidateQueries({ queryKey: ["players"] }),
        qc.invalidateQueries({ queryKey: ["games"] }),
        qc.invalidateQueries({ queryKey: ["wipe-summary"] }),
      ]);
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const onFile = async (file: File | null) => {
    if (!file) return;
    setMsg("");
    try {
      const rows = await parseWorkbook(file);
      setPreview(rows);
      setFileName(file.name);
      if (rows.length === 0) setMsg("ไม่พบแถวข้อมูลในไฟล์");
    } catch (e) {
      setPreview([]);
      setFileName("");
      setMsg(e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  };

  const counts = wipeCounts.data;

  return (
    <div className="page-block">
      <header className="page-head">
        <h1>นำเข้าผู้เล่น</h1>
        <p className="muted">
          คอลัมน์ <strong>เบอร์</strong> · <strong>ชื่อ</strong> ·{" "}
          <strong>ทีม</strong> (xlsx/csv) — อัปเดตตามทีม+เบอร์ · สร้างทีมใหม่ได้ ·{" "}
          <Link to="/players">จัดการรายคน</Link>
        </p>
      </header>

      {msg && <p className="banner ok">{msg}</p>}

      <section className="panel">
        <h2>ไฟล์นำเข้า</h2>
        <div className="toolbar import-toolbar">
          <button
            type="button"
            className="btn"
            onClick={() => void downloadTemplate()}
          >
            ดาวน์โหลดเทมเพลต
          </button>
          <label className="btn primary file-pick-btn">
            เลือกไฟล์
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              hidden
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {fileName && (
            <span className="muted file-name-chip" title={fileName}>
              {fileName}
            </span>
          )}
        </div>

        {preview.length > 0 && (
          <>
            <p className="muted report-note">
              พรีวิว {preview.length} แถว · พร้อมนำเข้า {validRows.length}
              {invalidCount > 0 ? ` · ผิดพลาด ${invalidCount}` : ""}
            </p>
            <ul className="import-preview-list">
              {preview.slice(0, 200).map((r) => (
                <li
                  key={`${r.line}-${r.jersey}-${r.team}`}
                  className={r.error ? "import-preview-item bad" : "import-preview-item"}
                >
                  <div className="import-preview-top">
                    <span className="import-jersey">#{r.jersey || "—"}</span>
                    <strong className="import-name">{r.name || "—"}</strong>
                    <span className={r.error ? "danger-text" : "ok-chip"}>
                      {r.error ?? "OK"}
                    </span>
                  </div>
                  <div className="import-preview-meta">
                    <span>{r.team || "—"}</span>
                    <span className="muted">แถว {r.line}</span>
                  </div>
                </li>
              ))}
            </ul>
            {preview.length > 200 && (
              <p className="muted">แสดง 200 แถวแรกจากทั้งหมด {preview.length}</p>
            )}
            <div className="toolbar import-actions">
              <button
                type="button"
                className="btn primary"
                disabled={validRows.length === 0 || importMut.isPending}
                onClick={() => importMut.mutate()}
              >
                {importMut.isPending
                  ? "กำลังนำเข้า…"
                  : `นำเข้า ${validRows.length} แถว`}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPreview([]);
                  setFileName("");
                }}
              >
                ล้างพรีวิว
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel danger-panel">
        <h2>ล้างระบบ (แมตช์ · ผู้เล่น · ทีม)</h2>
        <p className="muted report-note">
          ลบ<strong>ทั้งหมด</strong>ในระบบ — ไม่ใช่แค่แถวที่นำเข้า ·
          การแข่งขัน (ลีก) ยังอยู่ · หลังล้างให้รีเซ็ตแคชใน Courtside ด้วยถ้าเคยซิงก์ไว้
        </p>
        {counts && (
          <p className="wipe-summary">
            ตอนนี้มี แมตช์ <strong>{counts.games}</strong> · ผู้เล่น{" "}
            <strong>{counts.players}</strong> · ทีม{" "}
            <strong>{counts.teams}</strong>
            {counts.seasonRosters > 0
              ? ` · บัญชีฤดูกาล ${counts.seasonRosters}`
              : ""}
          </p>
        )}
        {wipeStep === 0 && (
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setWipePhrase("");
              setWipeStep(1);
            }}
          >
            ล้างระบบทั้งหมด…
          </button>
        )}
        {wipeStep === 1 && (
          <div className="wipe-confirm">
            <p>
              ขั้น 1/2 — ยืนยันว่าต้องการลบแมตช์ ผู้เล่น และทีมทั้งหมด
              {counts
                ? ` (${counts.games} / ${counts.players} / ${counts.teams})`
                : ""}
            </p>
            <div className="toolbar wipe-actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => setWipeStep(2)}
              >
                เข้าใจแล้ว ไปขั้นถัดไป
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setWipeStep(0);
                  setWipePhrase("");
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
        {wipeStep === 2 && (
          <div className="wipe-confirm">
            <p>
              ขั้น 2/2 — พิมพ์ <code>{WIPE_CONFIRM_PHRASE}</code> เพื่อยืนยัน
            </p>
            <label className="field-inline">
              ยืนยัน
              <input
                value={wipePhrase}
                onChange={(e) => setWipePhrase(e.target.value)}
                placeholder={WIPE_CONFIRM_PHRASE}
                autoComplete="off"
              />
            </label>
            <div className="toolbar wipe-actions">
              <button
                type="button"
                className="btn danger"
                disabled={
                  wipePhrase !== WIPE_CONFIRM_PHRASE || wipeMut.isPending
                }
                onClick={() => wipeMut.mutate()}
              >
                {wipeMut.isPending ? "กำลังล้าง…" : "ลบทั้งหมดทันที"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setWipeStep(0);
                  setWipePhrase("");
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
        {wipeSummary && wipeStep === 0 && (
          <p className="muted">
            ล้างล่าสุดในเซสชันนี้: แมตช์ {wipeSummary.games} · ผู้เล่น{" "}
            {wipeSummary.players} · ทีม {wipeSummary.teams}
          </p>
        )}
      </section>
    </div>
  );
}
