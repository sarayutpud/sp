import { isThreePointAttempt } from "@sp/rules-engine";
import type { BasketSide } from "@sp/shared-types";
import type { CSSProperties } from "react";

export type ShotChartClick = {
  x: number;
  y: number;
  isThree: boolean;
  basketSide: BasketSide;
};

type Props = {
  basketSide: BasketSide;
  onShot: (shot: ShotChartClick) => void;
  style?: CSSProperties;
};

/** FIBA half/full court click target — normalized 0–1 coords */
export function ShotChart({ basketSide, onShot, style }: Props) {
  return (
    <button
      type="button"
      aria-label="แผนที่สนามบาส — คลิกตำแหน่งช็อต"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "28 / 15",
        border: "3px solid #1a237e",
        background:
          "linear-gradient(90deg, #c9a46c 0%, #e2c48a 50%, #c9a46c 100%)",
        borderRadius: 6,
        padding: 0,
        cursor: "crosshair",
        boxShadow: "0 6px 0 rgba(26,35,126,0.2)",
        ...style,
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const isThree = isThreePointAttempt({ x, y }, basketSide);
        onShot({ x, y, isThree, basketSide });
      }}
    >
      <svg
        viewBox="0 0 280 150"
        width="100%"
        height="100%"
        style={{ pointerEvents: "none", display: "block" }}
        role="img"
      >
        <title>แผนที่สนามบาส</title>
        <rect
          x="1"
          y="1"
          width="278"
          height="148"
          fill="none"
          stroke="#1a237e"
          strokeWidth="2"
        />
        <line
          x1="140"
          y1="1"
          x2="140"
          y2="149"
          stroke="#1a237e"
          strokeWidth="1.5"
        />
        <circle
          cx="140"
          cy="75"
          r="18"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.5"
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
        <rect
          x="221"
          y="35"
          width="58"
          height="80"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.5"
        />
        <circle cx="16" cy="75" r="4" fill="#e53935" />
        <circle cx="264" cy="75" r="4" fill="#e53935" />
        <path
          d="M 16 75 m -67.5 0 a 67.5 67.5 0 0 1 67.5 -67.5"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          fontSize: 12,
          color: "#1a237e",
          background: "rgba(255,214,0,0.9)",
          padding: "2px 6px",
          fontWeight: 700,
          borderRadius: 4,
        }}
      >
        คลิกตำแหน่งช็อต · ตะกร้า{basketSide === "LEFT" ? "ซ้าย" : "ขวา"}
      </span>
    </button>
  );
}
