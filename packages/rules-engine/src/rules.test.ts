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
  it("classifies corner/arc threes vs paint twos", () => {
    const paint = isThreePointAttempt({ x: 0.08, y: 0.5 }, "LEFT");
    expect(paint).toBe(false);
    const deep = isThreePointAttempt({ x: 0.35, y: 0.5 }, "LEFT");
    expect(deep).toBe(true);
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
