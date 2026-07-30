import {
  effectiveFgPct,
  metersFromBasket,
  trueShootingPct,
  type BoxScoreLine,
} from "@sp/rules-engine";
import type { BoxLine, PbpEvent, Player } from "./types";

export type ShotPayload = {
  made?: boolean;
  isThree?: boolean;
  x?: number;
  y?: number;
  basketSide?: "LEFT" | "RIGHT";
  countsAsFga?: boolean;
};

export type CoachPlayerLine = BoxLine & {
  teamId: string;
  ftm: number;
  fta: number;
  fgm2: number;
  fga2: number;
  efg: number | null;
  ts: number | null;
  fgPct: number | null;
  threePct: number | null;
  twoPct: number | null;
  ppp: number | null;
};

export type ShotZone = "paint" | "mid" | "three";

export type ZoneLine = {
  zone: ShotZone;
  label: string;
  fga: number;
  fgm: number;
  pct: number | null;
};

export type PlayerZoneRow = {
  playerId: string;
  playerName: string;
  jersey: string;
  zones: ZoneLine[];
};

export type CoachInsight = {
  level: "good" | "warn" | "info";
  text: string;
};

const ZONE_LABELS: Record<ShotZone, string> = {
  paint: "ใต้แป้น (<4m)",
  mid: "กลางสนาม",
  three: "สามแต้ม",
};

export function fmtPct(v: number | null, digits = 1): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

function shotZone(
  payload: ShotPayload,
): ShotZone | null {
  if (payload.x == null || payload.y == null || !payload.basketSide) {
    if (payload.isThree) return "three";
    return null;
  }
  const { distanceM } = metersFromBasket(
    { x: payload.x, y: payload.y },
    payload.basketSide,
  );
  if (payload.isThree || distanceM >= 6.75) return "three";
  if (distanceM < 4) return "paint";
  return "mid";
}

function emptyZoneMap(): Record<ShotZone, { fga: number; fgm: number }> {
  return {
    paint: { fga: 0, fgm: 0 },
    mid: { fga: 0, fgm: 0 },
    three: { fga: 0, fgm: 0 },
  };
}

function toZoneLines(
  map: Record<ShotZone, { fga: number; fgm: number }>,
): ZoneLine[] {
  return (["paint", "mid", "three"] as const).map((zone) => {
    const { fga, fgm } = map[zone];
    return {
      zone,
      label: ZONE_LABELS[zone],
      fga,
      fgm,
      pct: fga > 0 ? fgm / fga : null,
    };
  });
}

function boxScoreLine(line: CoachPlayerLine): BoxScoreLine {
  return {
    pts: line.pts,
    fga: line.fga,
    fgm: line.fgm,
    tpa: line.tpa,
    tpm: line.tpm,
    fta: line.fta,
    ftm: line.ftm,
  };
}

export function buildCoachPlayerLines(
  events: PbpEvent[],
  players: Player[],
  teamFilter?: string,
): CoachPlayerLine[] {
  const names = new Map(players.map((p) => [p.id, p]));
  const lines = new Map<string, CoachPlayerLine>();

  for (const e of events) {
    if (e.type !== "SHOT" || !e.player_id) continue;
    if (teamFilter && e.team_id !== teamFilter) continue;
    const p = e.payload as ShotPayload;
    if (p.countsAsFga === false) continue;

    let line = lines.get(e.player_id);
    if (!line) {
      const meta = names.get(e.player_id);
      line = {
        playerId: e.player_id,
        playerName: meta?.display_name ?? e.player_id.slice(0, 8),
        jersey: meta?.jersey_number ?? "—",
        teamId: e.team_id ?? meta?.team_id ?? "",
        pts: 0,
        fgm: 0,
        fga: 0,
        tpm: 0,
        tpa: 0,
        ftm: 0,
        fta: 0,
        fgm2: 0,
        fga2: 0,
        efg: null,
        ts: null,
        fgPct: null,
        threePct: null,
        twoPct: null,
        ppp: null,
      };
      lines.set(e.player_id, line);
    }

    line.fga += 1;
    if (p.isThree) {
      line.tpa += 1;
      if (p.made) {
        line.tpm += 1;
        line.fgm += 1;
        line.pts += 3;
      }
    } else {
      line.fga2 += 1;
      if (p.made) {
        line.fgm2 += 1;
        line.fgm += 1;
        line.pts += 2;
      }
    }
  }

  for (const line of lines.values()) {
    const bs = boxScoreLine(line);
    line.efg = effectiveFgPct(bs);
    line.ts = trueShootingPct(bs);
    line.fgPct = line.fga > 0 ? line.fgm / line.fga : null;
    line.threePct = line.tpa > 0 ? line.tpm / line.tpa : null;
    line.twoPct = line.fga2 > 0 ? line.fgm2 / line.fga2 : null;
    line.ppp = line.fga > 0 ? line.pts / line.fga : null;
  }

  return [...lines.values()].sort((a, b) => b.pts - a.pts);
}

export function buildTeamZones(
  events: PbpEvent[],
  teamFilter?: string,
): ZoneLine[] {
  const map = emptyZoneMap();

  for (const e of events) {
    if (e.type !== "SHOT" || !e.player_id) continue;
    if (teamFilter && e.team_id !== teamFilter) continue;
    const p = e.payload as ShotPayload;
    if (p.countsAsFga === false) continue;
    const zone = shotZone(p);
    if (!zone) continue;
    map[zone].fga += 1;
    if (p.made) map[zone].fgm += 1;
  }

  return toZoneLines(map);
}

export function buildPlayerZones(
  events: PbpEvent[],
  players: Player[],
  teamFilter?: string,
): PlayerZoneRow[] {
  const names = new Map(players.map((p) => [p.id, p]));
  const byPlayer = new Map<string, Record<ShotZone, { fga: number; fgm: number }>>();

  for (const e of events) {
    if (e.type !== "SHOT" || !e.player_id) continue;
    if (teamFilter && e.team_id !== teamFilter) continue;
    const p = e.payload as ShotPayload;
    if (p.countsAsFga === false) continue;
    const zone = shotZone(p);
    if (!zone) continue;

    let map = byPlayer.get(e.player_id);
    if (!map) {
      map = emptyZoneMap();
      byPlayer.set(e.player_id, map);
    }
    map[zone].fga += 1;
    if (p.made) map[zone].fgm += 1;
  }

  return [...byPlayer.entries()]
    .map(([playerId, map]) => {
      const meta = names.get(playerId);
      return {
        playerId,
        playerName: meta?.display_name ?? playerId.slice(0, 8),
        jersey: meta?.jersey_number ?? "—",
        zones: toZoneLines(map),
      };
    })
    .sort((a, b) => {
      const aFga = a.zones.reduce((s, z) => s + z.fga, 0);
      const bFga = b.zones.reduce((s, z) => s + z.fga, 0);
      return bFga - aFga;
    });
}

export function buildCoachInsights(
  players: CoachPlayerLine[],
  teamZones: ZoneLine[],
  teamName: string,
): CoachInsight[] {
  const insights: CoachInsight[] = [];
  if (players.length === 0) return insights;

  const totalFga = players.reduce((s, p) => s + p.fga, 0);
  const totalTpa = players.reduce((s, p) => s + p.tpa, 0);
  const teamEfg =
    totalFga > 0
      ? players.reduce((s, p) => s + (p.fgm + 0.5 * p.tpm), 0) / totalFga
      : null;

  if (teamEfg !== null) {
    insights.push({
      level: teamEfg >= 0.5 ? "good" : teamEfg < 0.42 ? "warn" : "info",
      text: `${teamName}: eFG% รวม ${fmtPct(teamEfg)} ${teamEfg >= 0.5 ? "(ดี)" : teamEfg < 0.42 ? "(ต่ำกว่ามาตรฐาน)" : ""}`,
    });
  }

  const threeRate = totalFga > 0 ? totalTpa / totalFga : null;
  if (threeRate !== null && threeRate > 0.4) {
    const team3 = totalTpa > 0 ? players.reduce((s, p) => s + p.tpm, 0) / totalTpa : 0;
    const suffix =
      team3 < 0.3 ? " → พิจารณาลดการยิง 3 หรือสร้างลุก open look" : "";
    insights.push({
      level: team3 < 0.3 ? "warn" : "info",
      text: `ทีมยิงสามแต้ม ${fmtPct(threeRate)} ของจังหวะ — แม่น ${fmtPct(team3)}${suffix}`,
    });
  }

  for (const z of teamZones) {
    if (z.fga < 3) continue;
    if (z.pct !== null && z.pct >= 0.55) {
      insights.push({
        level: "good",
        text: `จุดแข็ง: โซน${z.label} แม่น ${fmtPct(z.pct)} (${z.fgm}/${z.fga})`,
      });
    }
    if (z.pct !== null && z.pct < 0.35 && z.fga >= 5) {
      insights.push({
        level: "warn",
        text: `จุดอ่อน: โซน${z.label} แม่นแค่ ${fmtPct(z.pct)} (${z.fgm}/${z.fga}) — ฝึกเลือกจังหวะหรือหาช็อตที่ดีกว่า`,
      });
    }
  }

  const bestEfg = [...players].filter((p) => p.fga >= 3).sort((a, b) => (b.efg ?? 0) - (a.efg ?? 0))[0];
  if (bestEfg?.efg != null) {
    insights.push({
      level: "good",
      text: `ผู้เล่นประสิทธิภาพสูง: ${bestEfg.jersey} ${bestEfg.playerName} — eFG% ${fmtPct(bestEfg.efg)}, ${bestEfg.pts} แต้ม`,
    });
  }

  const highVolLow = players.find(
    (p) => p.fga >= 6 && p.fgPct !== null && p.fgPct < 0.35,
  );
  if (highVolLow) {
    insights.push({
      level: "warn",
      text: `ระวังการเลือกช็อต: ${highVolLow.jersey} ${highVolLow.playerName} ยิง ${highVolLow.fga} ครั้ง แม่น ${fmtPct(highVolLow.fgPct)}`,
    });
  }

  const paintZone = teamZones.find((z) => z.zone === "paint");
  if (paintZone && paintZone.fga >= 4 && paintZone.pct !== null && paintZone.pct >= 0.6) {
    insights.push({
      level: "good",
      text: "เกมนี้ทีมจบลูกใต้แป้นได้ดี — ควรรักษาแนวทาง drive / cut",
    });
  }

  return insights.slice(0, 8);
}

/** Team totals for summary row */
export function buildTeamTotals(lines: CoachPlayerLine[]): CoachPlayerLine | null {
  if (lines.length === 0) return null;
  const tot: CoachPlayerLine = {
    playerId: "team",
    playerName: "รวมทีม",
    jersey: "—",
    teamId: lines[0]?.teamId ?? "",
    pts: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    fgm2: 0,
    fga2: 0,
    efg: null,
    ts: null,
    fgPct: null,
    threePct: null,
    twoPct: null,
    ppp: null,
  };
  for (const l of lines) {
    tot.pts += l.pts;
    tot.fgm += l.fgm;
    tot.fga += l.fga;
    tot.tpm += l.tpm;
    tot.tpa += l.tpa;
    tot.fgm2 += l.fgm2;
    tot.fga2 += l.fga2;
  }
  const bs = boxScoreLine(tot);
  tot.efg = effectiveFgPct(bs);
  tot.ts = trueShootingPct(bs);
  tot.fgPct = tot.fga > 0 ? tot.fgm / tot.fga : null;
  tot.threePct = tot.tpa > 0 ? tot.tpm / tot.tpa : null;
  tot.twoPct = tot.fga2 > 0 ? tot.fgm2 / tot.fga2 : null;
  tot.ppp = tot.fga > 0 ? tot.pts / tot.fga : null;
  return tot;
}
