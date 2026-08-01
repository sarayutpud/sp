import { effectiveFgPct, trueShootingPct } from "@sp/rules-engine";
import type { CoachPlayerLine, ZoneLine } from "./coach-reports";
import { fmtPct } from "./coach-reports";
import type { FullBoxLine } from "./stats-reports";

export type EvalBand = "ดี" | "ปานกลาง" | "ต้องพัฒนา" | "ข้อมูลน้อย";

export type PlayerEvalCard = {
  playerId: string;
  playerName: string;
  jersey: string;
  band: EvalBand;
  bandNote: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  efg: number | null;
  ts: number | null;
  ef: number | null;
  plusMinus: number | null;
  zones: ZoneLine[];
  tips: string[];
};

export type PlayerEvalTrendGame = {
  gameId: string;
  label: string;
  scheduledAt: string | null;
  pts: number;
  reb: number;
  ast: number;
  fga: number;
  efg: number | null;
};

/** Derive coach-facing band from volume + eFG (no stored grades). */
export function evalBandFromShooting(
  fga: number,
  efg: number | null,
): { band: EvalBand; note: string } {
  if (fga < 3 || efg === null) {
    return {
      band: "ข้อมูลน้อย",
      note: "ยิงน้อยกว่า 3 ครั้ง — ดูการมีส่วนร่วมด้านอื่นประกอบ",
    };
  }
  if (efg >= 0.5) {
    return { band: "ดี", note: "ประสิทธิภาพการยิงดี (eFG ≥ 50%)" };
  }
  if (efg >= 0.35) {
    return { band: "ปานกลาง", note: "ยิงได้พอใช้ — ยังปรับโซน/การเลือกช็อตได้" };
  }
  return {
    band: "ต้องพัฒนา",
    note: fga >= 6 ? "ยิงเยอะแต่ eFG ต่ำ — โฟกัสคุณภาพช็อต" : "eFG ต่ำในนัดนี้",
  };
}

export function buildPlayerEvalCard(input: {
  box: FullBoxLine;
  coach?: CoachPlayerLine | null;
  zones?: ZoneLine[];
  ef?: number | null;
  plusMinus?: number | null;
}): PlayerEvalCard {
  const { box, coach, zones = [], ef = null, plusMinus = null } = input;
  const efg =
    coach?.efg ??
    effectiveFgPct({
      pts: box.pts,
      fga: box.fga,
      fgm: box.fgm,
      tpa: box.tpa,
      tpm: box.tpm,
      fta: box.fta,
      ftm: box.ftm,
    });
  const ts =
    trueShootingPct({
      pts: box.pts,
      fga: box.fga,
      fgm: box.fgm,
      tpa: box.tpa,
      tpm: box.tpm,
      fta: box.fta,
      ftm: box.ftm,
    }) ?? coach?.ts ?? null;

  const { band, note } = evalBandFromShooting(box.fga, efg);
  const tips: string[] = [note];

  if (box.ast >= 4) tips.push(`จ่ายเกมได้ดี (${box.ast} AST)`);
  if (box.reb >= 8) tips.push(`เก็บรีบาวด์โดดเด่น (${box.reb} REB)`);
  if (box.tov >= 4 && box.ast + box.pts > 0) {
    tips.push(`เทิร์นโอเวอร์สูง (${box.tov} TO) — ระวังการตัดสินใจ`);
  }
  const paint = zones.find((z) => z.zone === "paint");
  const three = zones.find((z) => z.zone === "three");
  if (three && three.fga >= 4 && (three.pct ?? 0) < 0.25) {
    tips.push("สามแต้มในนัดนี้ยังไม่เข้า — เลือกช็อตหรือโฟกัสใต้แป้น");
  }
  if (paint && paint.fga >= 3 && (paint.pct ?? 0) >= 0.55) {
    tips.push("แข็งใต้แป้น — ใช้เป็นจุดเริ่มเกมโจมตีได้");
  }

  return {
    playerId: box.playerId,
    playerName: box.playerName,
    jersey: box.jersey,
    band,
    bandNote: note,
    pts: box.pts,
    reb: box.reb,
    ast: box.ast,
    stl: box.stl,
    blk: box.blk,
    tov: box.tov,
    pf: box.pf,
    fgm: box.fgm,
    fga: box.fga,
    tpm: box.tpm,
    tpa: box.tpa,
    ftm: box.ftm,
    fta: box.fta,
    efg,
    ts,
    ef,
    plusMinus,
    zones,
    tips: tips.slice(0, 4),
  };
}

export function buildPlayerEvalTrend(
  games: Array<{
    gameId: string;
    label: string;
    scheduledAt: string | null;
    box: FullBoxLine | undefined;
  }>,
): PlayerEvalTrendGame[] {
  return games
    .filter((g) => g.box)
    .map((g) => {
      const box = g.box!;
      const efg = effectiveFgPct({
        pts: box.pts,
        fga: box.fga,
        fgm: box.fgm,
        tpa: box.tpa,
        tpm: box.tpm,
        fta: box.fta,
        ftm: box.ftm,
      });
      return {
        gameId: g.gameId,
        label: g.label,
        scheduledAt: g.scheduledAt,
        pts: box.pts,
        reb: box.reb,
        ast: box.ast,
        fga: box.fga,
        efg,
      };
    });
}

export { fmtPct };
