import { toPng } from "html-to-image";
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

/** Absolute public share URL for a match report (no login required). */
export function publicReportUrl(gameId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/${gameId}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Capture a DOM subtree as PNG and trigger download (report body only). */
export async function downloadElementPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
    backgroundColor: "#ffffff",
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
