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
        border: "2px solid #1a3a2a",
        background:
          "linear-gradient(90deg, #c4a574 0%, #d4b896 50%, #c4a574 100%)",
        borderRadius: 4,
        padding: 0,
        cursor: "crosshair",
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
        aria-hidden
      >
        <rect x="1" y="1" width="278" height="148" fill="none" stroke="#1a3a2a" strokeWidth="2" />
        <line x1="140" y1="1" x2="140" y2="149" stroke="#1a3a2a" strokeWidth="1.5" />
        <circle cx="140" cy="75" r="18" fill="none" stroke="#1a3a2a" strokeWidth="1.5" />
        <rect x="1" y="35" width="58" height="80" fill="none" stroke="#1a3a2a" strokeWidth="1.5" />
        <rect x="221" y="35" width="58" height="80" fill="none" stroke="#1a3a2a" strokeWidth="1.5" />
        <circle cx="16" cy="75" r="4" fill="#c0392b" />
        <circle cx="264" cy="75" r="4" fill="#c0392b" />
        <path
          d="M 16 75 m -67.5 0 a 67.5 67.5 0 0 1 67.5 -67.5"
          fill="none"
          stroke="#1a3a2a"
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
          color: "#1a3a2a",
          background: "rgba(255,255,255,0.7)",
          padding: "2px 6px",
        }}
      >
        คลิกตำแหน่งช็อต · ตะกร้า{basketSide === "LEFT" ? "ซ้าย" : "ขวา"}
      </span>
    </button>
  );
}
