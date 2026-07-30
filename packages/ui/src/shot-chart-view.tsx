import type { CSSProperties } from "react";

/** A single shot normalized to the attacking half-court (vx/vy in 0..1). */
export type ShotDot = {
  vx: number;
  vy: number;
  made: boolean;
  isThree: boolean;
};

/** FG% per zone (0..1) used to tint the court hot/cold. */
export type ZoneShades = {
  paint: number | null;
  mid: number | null;
  three: number | null;
};

type Props = {
  shots: ShotDot[];
  zones?: ZoneShades;
  style?: CSSProperties;
};

function zoneFill(pct: number | null): string {
  if (pct === null) return "rgba(120,130,180,0.08)";
  if (pct >= 0.5) return "rgba(27,143,90,0.30)";
  if (pct < 0.35) return "rgba(229,57,53,0.26)";
  return "rgba(244,180,0,0.28)";
}

/**
 * Read-only shot chart: plots made/missed markers on a FIBA half court and
 * tints the paint / mid-range / three-point regions by shooting %.
 * Coordinates are normalized to a single attacking basket (left side).
 */
export function ShotChartView({ shots, zones, style }: Props) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 520,
        aspectRatio: "14 / 15",
        border: "3px solid #1a237e",
        background:
          "linear-gradient(120deg, #d8b783 0%, #e7cd9c 50%, #d8b783 100%)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 6px 18px rgba(26,35,126,0.18)",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 140 150"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ display: "block" }}
        aria-label="แผนภาพการยิง"
      >
        <title>แผนภาพการยิง (Shot Chart)</title>

        {/* zone tints: three region (outside arc) → mid (inside arc) → paint */}
        <path
          d="M 16 8 A 66 66 0 0 1 16 142 L 139 142 L 139 8 Z"
          fill={zoneFill(zones?.three ?? null)}
        />
        <path
          d="M 16 8 A 66 66 0 0 1 16 142 Z"
          fill={zoneFill(zones?.mid ?? null)}
        />
        <rect
          x="1"
          y="35"
          width="58"
          height="80"
          fill={zoneFill(zones?.paint ?? null)}
        />

        {/* court lines */}
        <rect
          x="1"
          y="1"
          width="138"
          height="148"
          fill="none"
          stroke="#1a237e"
          strokeWidth="2"
        />
        <rect
          x="1"
          y="35"
          width="58"
          height="80"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.5"
        />
        <circle
          cx="49"
          cy="75"
          r="15"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.5"
        />
        <path
          d="M 16 8 A 66 66 0 0 1 16 142"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.5"
        />
        <circle cx="16" cy="75" r="4" fill="#e53935" />
        <line
          x1="12"
          y1="66"
          x2="12"
          y2="84"
          stroke="#1a237e"
          strokeWidth="1.5"
        />

        {/* shot markers */}
        {shots.map((s, i) => {
          const cx = Math.max(4, Math.min(136, s.vx * 140));
          const cy = Math.max(4, Math.min(146, s.vy * 150));
          return s.made ? (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: shots are positional, no stable id
              key={i}
              cx={cx}
              cy={cy}
              r={s.isThree ? 3.4 : 3}
              fill="rgba(27,143,90,0.9)"
              stroke="#fff"
              strokeWidth="0.8"
            />
          ) : (
            <g
              // biome-ignore lint/suspicious/noArrayIndexKey: shots are positional, no stable id
              key={i}
              stroke="#c62828"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <line x1={cx - 2.6} y1={cy - 2.6} x2={cx + 2.6} y2={cy + 2.6} />
              <line x1={cx - 2.6} y1={cy + 2.6} x2={cx + 2.6} y2={cy - 2.6} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
