import { fmtPct } from "./coach-reports";
import type { FullBoxLine } from "./stats-reports";

type ShareInput = {
  matchLabel: string;
  teamName: string;
  scheduledAt: string | null;
  box: FullBoxLine[];
  insights: string[];
  totals: {
    pts: number;
    reb: number;
    ast: number;
    fgm: number;
    fga: number;
    tpm: number;
    tpa: number;
  } | null;
};

/** Plain-text summary for sharing a single match report */
export function buildMatchShareText(input: ShareInput): string {
  const when = input.scheduledAt
    ? new Date(input.scheduledAt).toLocaleString("th-TH")
    : "ไม่ระบุเวลา";
  const lines: string[] = [
    "SP FITNESS — รายงานแมตช์",
    input.matchLabel,
    `ทีม: ${input.teamName}`,
    `เวลา: ${when}`,
    "",
  ];

  if (input.totals) {
    lines.push(
      `รวมทีม: ${input.totals.pts} PTS · FG ${input.totals.fgm}/${input.totals.fga} · 3PT ${input.totals.tpm}/${input.totals.tpa} · REB ${input.totals.reb} · AST ${input.totals.ast}`,
      "",
    );
  }

  if (input.insights.length > 0) {
    lines.push("คำแนะนำโค้ช:");
    for (const tip of input.insights) lines.push(`• ${tip}`);
    lines.push("");
  }

  lines.push("Box Score:");
  lines.push("# | ผู้เล่น | PTS | REB | AST | FG | 3PT");
  for (const row of input.box) {
    lines.push(
      `${row.jersey} | ${row.playerName} | ${row.pts} | ${row.reb} | ${row.ast} | ${row.fgm}/${row.fga} | ${row.tpm}/${row.tpa}`,
    );
  }

  lines.push("", `สร้างจาก SP CMS · ${new Date().toLocaleString("th-TH")}`);
  return lines.join("\n");
}

export function buildMatchShareCsv(input: ShareInput): string {
  const rows = [
    [
      "jersey",
      "player",
      "pts",
      "reb",
      "ast",
      "stl",
      "blk",
      "tov",
      "pf",
      "fgm",
      "fga",
      "tpm",
      "tpa",
      "ftm",
      "fta",
      "fg_pct",
    ],
    ...input.box.map((r) => [
      r.jersey,
      r.playerName,
      String(r.pts),
      String(r.reb),
      String(r.ast),
      String(r.stl),
      String(r.blk),
      String(r.tov),
      String(r.pf),
      String(r.fgm),
      String(r.fga),
      String(r.tpm),
      String(r.tpa),
      String(r.ftm),
      String(r.fta),
      fmtPct(r.fga > 0 ? r.fgm / r.fga : null),
    ]),
  ];
  return rows
    .map((cols) =>
      cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadText(
  title: string,
  text: string,
  filename: string,
): Promise<"shared" | "downloaded"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch {
      // fall through to download on cancel/unsupported payload
    }
  }
  downloadTextFile(filename, text);
  return "downloaded";
}
