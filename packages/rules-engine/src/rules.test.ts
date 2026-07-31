import { describe, expect, it } from "vitest";
import {
  attackSideForPeriod,
  isThreePointAttempt,
  metersFromBasket,
} from "./court.js";
import {
  doesReboundStartNewPossession,
  filterEligibleOnCourt,
  isInBonus,
  isPlayerFouledOut,
} from "./possession.js";
import { effectiveFgPct, shotAttemptFlags, trueShootingPct } from "./stats.js";

describe("FIBA court", () => {
  it("classifies paint as 2PT and top-of-key as 3PT (left basket)", () => {
    expect(isThreePointAttempt({ x: 0.08, y: 0.5 }, "LEFT")).toBe(false);
    expect(isThreePointAttempt({ x: 0.35, y: 0.5 }, "LEFT")).toBe(true);
  });

  it("classifies paint as 2PT and top-of-key as 3PT (right basket)", () => {
    expect(isThreePointAttempt({ x: 0.92, y: 0.5 }, "RIGHT")).toBe(false);
    expect(isThreePointAttempt({ x: 0.65, y: 0.5 }, "RIGHT")).toBe(true);
  });

  it("treats corner strip as 3PT for both baskets", () => {
    // Near left baseline, outside 0.9m sideline line
    expect(isThreePointAttempt({ x: 0.05, y: 0.03 }, "LEFT")).toBe(true);
    expect(isThreePointAttempt({ x: 0.05, y: 0.97 }, "LEFT")).toBe(true);
    // Same spot vs right basket is still outside that basket's corner strip
    expect(isThreePointAttempt({ x: 0.95, y: 0.03 }, "RIGHT")).toBe(true);
    expect(isThreePointAttempt({ x: 0.95, y: 0.97 }, "RIGHT")).toBe(true);
  });

  it("does not treat wing inside the arc as 3PT", () => {
    // ~4m from left basket, mid-wing (inside arc, not in corner strip)
    expect(isThreePointAttempt({ x: 0.2, y: 0.35 }, "LEFT")).toBe(false);
    expect(isThreePointAttempt({ x: 0.8, y: 0.35 }, "RIGHT")).toBe(false);
  });

  it("same click can be 2PT for one basket and 3PT for the other", () => {
    // Deep on the left half: 3 vs LEFT, but far from RIGHT → also 3 vs RIGHT
    // Use a spot inside left paint: 2 vs LEFT, 3 vs RIGHT (distance to right basket is huge)
    const inLeftPaint = { x: 0.08, y: 0.5 };
    expect(isThreePointAttempt(inLeftPaint, "LEFT")).toBe(false);
    expect(isThreePointAttempt(inLeftPaint, "RIGHT")).toBe(true);
  });

  it("flips attack side after halftime", () => {
    expect(attackSideForPeriod("LEFT", 1, true)).toBe("LEFT");
    expect(attackSideForPeriod("LEFT", 3, true)).toBe("RIGHT");
    expect(attackSideForPeriod("LEFT", 3, false)).toBe("LEFT");
  });

  it("computes distance from basket", () => {
    const { distanceM } = metersFromBasket({ x: 0.08, y: 0.5 }, "LEFT");
    expect(distanceM).toBeGreaterThan(0);
    expect(distanceM).toBeLessThan(3);
  });
});

describe("advanced stats", () => {
  it("computes TS% and eFG%", () => {
    const line = { pts: 20, fga: 10, fgm: 6, tpa: 4, tpm: 2, fta: 4, ftm: 4 };
    expect(trueShootingPct(line)).toBeCloseTo(20 / (2 * (10 + 0.44 * 4)));
    expect(effectiveFgPct(line)).toBeCloseTo((6 + 0.5 * 2) / 10);
  });

  it("applies And-1 / shooting foul miss FGA rules", () => {
    expect(shotAttemptFlags({ made: false, fouledOnShot: true })).toEqual({
      countsAsFga: false,
      andOne: false,
    });
    expect(shotAttemptFlags({ made: true, fouledOnShot: true })).toEqual({
      countsAsFga: true,
      andOne: true,
    });
  });
});

describe("possession and fouls", () => {
  it("does not start new possession on offensive rebound", () => {
    expect(doesReboundStartNewPossession("OFFENSIVE")).toBe(false);
    expect(doesReboundStartNewPossession("DEFENSIVE")).toBe(true);
  });

  it("filters fouled-out players from on-court picks", () => {
    expect(isPlayerFouledOut(5)).toBe(true);
    expect(isInBonus(5)).toBe(true);
    expect(filterEligibleOnCourt(["a", "b"], { a: 5, b: 2 })).toEqual(["b"]);
  });
});
