/**
 * FIBA full court geometry (meters).
 * Court: 28m x 15m. Basket at 1.575m from baseline center.
 * 3PT arc radius: 6.75m from basket center; corners are straight lines
 * 0.90m from each sideline.
 */
export const FIBA = {
  lengthM: 28,
  widthM: 15,
  basketFromBaselineM: 1.575,
  threeArcRadiusM: 6.75,
  /** Distance from sideline to the corner 3 straight section */
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
 * FIBA 3PT relative to the shooter's attack basket.
 * - Corner strips (outside the 0.90m sideline parallels) are 3PT
 * - Elsewhere: strictly outside the 6.75m arc is 3PT (on the line = 2PT)
 */
export function isThreePointAttempt(
  point: NormalizedPoint,
  basketSide: "LEFT" | "RIGHT",
): boolean {
  const { distanceM } = metersFromBasket(point, basketSide);
  const py = point.y * FIBA.widthM;
  const corner = FIBA.threeCornerFromSidelineM;
  const outsideCorner = py < corner || py > FIBA.widthM - corner;
  if (outsideCorner) return true;
  return distanceM > FIBA.threeArcRadiusM;
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
