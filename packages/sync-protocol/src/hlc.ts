import type { Hlc } from "@sp/shared-types";

/** Hybrid Logical Clock — tick on local events, merge on receive */
export function createHlc(deviceId: string, wallMs = Date.now()): Hlc {
  return { wallMs, logical: 0, deviceId };
}

export function tickHlc(current: Hlc, nowMs = Date.now()): Hlc {
  if (nowMs > current.wallMs) {
    return { wallMs: nowMs, logical: 0, deviceId: current.deviceId };
  }
  return {
    wallMs: current.wallMs,
    logical: current.logical + 1,
    deviceId: current.deviceId,
  };
}

export function mergeHlc(local: Hlc, remote: Hlc, nowMs = Date.now()): Hlc {
  const maxWall = Math.max(local.wallMs, remote.wallMs, nowMs);
  let logical = 0;
  if (maxWall === local.wallMs && maxWall === remote.wallMs) {
    logical = Math.max(local.logical, remote.logical) + 1;
  } else if (maxWall === local.wallMs) {
    logical = local.logical + 1;
  } else if (maxWall === remote.wallMs) {
    logical = remote.logical + 1;
  }
  return { wallMs: maxWall, logical, deviceId: local.deviceId };
}

export function compareHlc(a: Hlc, b: Hlc): number {
  if (a.wallMs !== b.wallMs) return a.wallMs - b.wallMs;
  if (a.logical !== b.logical) return a.logical - b.logical;
  return a.deviceId.localeCompare(b.deviceId);
}
