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
  /** Attack basket for the focused team (highlight only; both ends are drawable). */
  basketSide: BasketSide;
  onShot: (shot: ShotChartClick) => void;
  style?: CSSProperties;
  homeCode?: string;
  awayCode?: string;
  /** When set, click preview uses these baskets for dual 2P/3P hint. */
  homeBasketSide?: BasketSide;
  awayBasketSide?: BasketSide;
  /** Yellow focus legend overlay — off by default (live UI uses the side rail). */
  showLegend?: boolean;
};

/** FIBA full court click target — normalized 0–1 coords */
export function ShotChart({
  basketSide,
  onShot,
  style,
  homeCode = "HOME",
  awayCode = "AWAY",
  homeBasketSide,
  awayBasketSide,
  showLegend = false,
}: Props) {
  const homeBasket = homeBasketSide ?? basketSide;
  const awayBasket =
    awayBasketSide ?? (basketSide === "LEFT" ? "RIGHT" : "LEFT");

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
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const svg = el.querySelector("svg");
        const box = svg?.getBoundingClientRect() ?? rect;
        const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
        const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
        const isThree = isThreePointAttempt({ x, y }, basketSide);
        onShot({ x, y, isThree, basketSide });
      }}
    >
      <svg
        viewBox="0 0 280 150"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
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
        <circle
          cx="16"
          cy="75"
          r="5"
          fill={basketSide === "LEFT" ? "#e53935" : "#1a237e"}
          opacity={basketSide === "LEFT" ? 1 : 0.55}
        />
        <circle
          cx="264"
          cy="75"
          r="5"
          fill={basketSide === "RIGHT" ? "#e53935" : "#1a237e"}
          opacity={basketSide === "RIGHT" ? 1 : 0.55}
        />
        <line
          x1="1"
          y1="9"
          x2="30.15"
          y2="9"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <line
          x1="1"
          y1="141"
          x2="30.15"
          y2="141"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <path
          d="M 30.15 9 A 67.5 67.5 0 0 1 30.15 141"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <line
          x1="279"
          y1="9"
          x2="249.85"
          y2="9"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <line
          x1="279"
          y1="141"
          x2="249.85"
          y2="141"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <path
          d="M 249.85 9 A 67.5 67.5 0 0 0 249.85 141"
          fill="none"
          stroke="#1a237e"
          strokeWidth="1.4"
          opacity={0.85}
        />
        <text
          x="22"
          y="14"
          fill="#1a237e"
          fontSize="8"
          fontWeight="700"
          opacity="0.7"
        >
          L
        </text>
        <text
          x="250"
          y="14"
          fill="#1a237e"
          fontSize="8"
          fontWeight="700"
          opacity="0.7"
        >
          R
        </text>
      </svg>
      {showLegend ? (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            fontSize: 10,
            color: "#1a237e",
            background: "rgba(255,214,0,0.92)",
            padding: "3px 7px",
            fontWeight: 700,
            borderRadius: 4,
            maxWidth: "46%",
            textAlign: "right",
            lineHeight: 1.25,
            pointerEvents: "none",
          }}
        >
          ตะกร้าโฟกัส {basketSide === "LEFT" ? "L" : "R"}
          <br />
          {homeCode}→{homeBasket === "LEFT" ? "L" : "R"} · {awayCode}→
          {awayBasket === "LEFT" ? "L" : "R"}
          <br />
          2P/3P ตามฝั่งยิง
        </span>
      ) : null}
    </button>
  );
}
