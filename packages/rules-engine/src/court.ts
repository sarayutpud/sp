/**
 * FIBA full court geometry (meters).
 * Court: 28m x 15m. Basket at 1.575m from baseline center.
 * 3PT arc radius: 6.75m from basket center; corners are straight lines.
 */
export const FIBA = {
  lengthM: 28,
  widthM: 15,
  basketFromBaselineM: 1.575,
  threeArcRadiusM: 6.75,
  /** Distance from sideline to start of corner 3 straight section */
  threeCornerFromSidelineM: 0.9,
} as const;

export type NormalizedPoint = { x: number; y: number };

/** Convert normalized court coords (0–1 full court, x along length, y along width) to meters from attacking basket */
export function metersFromBasket(
  point: NormalizedPoint,
  basketSide: "LEFT" | "RIGHT",
): { dx: number; dy: number; distanceM: number } {
  const basketX =
    basketSide === "LEFT"
      ? FIBA.basketFromBaselineM
      : FIBA.lengthM - FIBA.basketFromBaselineM;
  const basketY = FIBA.widthM / 2;
  const px = point.x * FIBA.lengthM;
  const py = point.y * FIBA.widthM;
  const dx = px - basketX;
  const dy = py - basketY;
  return { dx, dy, distanceM: Math.hypot(dx, dy) };
}

/**
 * FIBA 3PT: outside the arc (6.75m) or beyond corner lines.
 * Simplified: if |dy| places shot in corner zone and |dx| beyond corner line → 3PT;
 * else distance > 6.75 → 3PT.
 */
export function isThreePointAttempt(
  point: NormalizedPoint,
  basketSide: "LEFT" | "RIGHT",
): boolean {
  const { dx, dy, distanceM } = metersFromBasket(point, basketSide);
  const absDy = Math.abs(dy);
  const cornerInnerY = FIBA.threeCornerFromSidelineM;
  const cornerOuterY = FIBA.widthM - FIBA.threeCornerFromSidelineM;
  const py = point.y * FIBA.widthM;
  const inCornerLane = py <= cornerInnerY || py >= cornerOuterY;

  if (inCornerLane) {
    // Corner 3: beyond the straight line parallel to sideline at ~6.6m effective along length from basket
    // FIBA corner distance from basket center to line ≈ sqrt(6.75^2 - (7.5-0.9)^2) wait —
    // Official: the 3pt line is 0.9m from sideline; use distance from basket > arc OR outside corner line.
    // Practical: in corner, require distanceM >= 6.75 * 0.98 as approximation, or |dx| check.
    const signedAlong = basketSide === "LEFT" ? dx : -dx;
    return signedAlong >= 6.6 || distanceM >= FIBA.threeArcRadiusM;
  }

  return distanceM >= FIBA.threeArcRadiusM && Math.abs(absDy) >= 0;
}

/** Periods 3–4 (and OT) flip home attack side from period-1 orientation */
export function attackSideForPeriod(
  homeAttackSidePeriod1: "LEFT" | "RIGHT",
  period: number,
  isHomeTeam: boolean,
): "LEFT" | "RIGHT" {
  const flipped = period >= 3;
  const homeSide = flipped
    ? homeAttackSidePeriod1 === "LEFT"
      ? "RIGHT"
      : "LEFT"
    : homeAttackSidePeriod1;
  if (isHomeTeam) return homeSide;
  return homeSide === "LEFT" ? "RIGHT" : "LEFT";
}
