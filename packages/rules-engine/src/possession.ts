export type ReboundKind = "OFFENSIVE" | "DEFENSIVE" | "TEAM";

/**
 * Offensive rebound continues the current possession.
 * Defensive / team defensive ends it and starts a new one for the other team.
 */
export function doesReboundStartNewPossession(kind: ReboundKind): boolean {
  return kind !== "OFFENSIVE";
}

export function isPlayerFouledOut(
  personalFouls: number,
  foulOutCount = 5,
): boolean {
  return personalFouls >= foulOutCount;
}

export function isInBonus(teamFoulsInPeriod: number, bonusAt = 5): boolean {
  return teamFoulsInPeriod >= bonusAt;
}

/** Eligible players = on court and not fouled out */
export function filterEligibleOnCourt(
  onCourtPlayerIds: string[],
  foulCounts: Record<string, number>,
  foulOutCount = 5,
): string[] {
  return onCourtPlayerIds.filter(
    (id) => !isPlayerFouledOut(foulCounts[id] ?? 0, foulOutCount),
  );
}
