import { describe, expect, it } from "vitest";
import { compareHlc, createHlc, mergeHlc, tickHlc } from "./hlc";

describe("HLC", () => {
  it("ticks logical when wall does not advance", () => {
    const a = createHlc("dev-a", 1000);
    const b = tickHlc(a, 1000);
    expect(b.logical).toBe(1);
    expect(b.wallMs).toBe(1000);
  });

  it("merges remote clock without losing order", () => {
    const local = createHlc("dev-a", 1000);
    const remote = { wallMs: 2000, logical: 3, deviceId: "dev-b" };
    const merged = mergeHlc(local, remote, 1500);
    expect(merged.wallMs).toBe(2000);
    expect(compareHlc(merged, remote)).toBeGreaterThan(0);
  });
});
