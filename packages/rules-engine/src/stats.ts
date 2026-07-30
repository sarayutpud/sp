export type BoxScoreLine = {
  pts: number;
  fga: number;
  fgm: number;
  tpa: number;
  tpm: number;
  fta: number;
  ftm: number;
};

/** TS% = PTS / (2 * (FGA + 0.44 * FTA)) */
export function trueShootingPct(line: BoxScoreLine): number | null {
  const denom = 2 * (line.fga + 0.44 * line.fta);
  if (denom <= 0) return null;
  return line.pts / denom;
}

/** eFG% = (FGM + 0.5 * 3PM) / FGA */
export function effectiveFgPct(line: BoxScoreLine): number | null {
  if (line.fga <= 0) return null;
  return (line.fgm + 0.5 * line.tpm) / line.fga;
}

/**
 * Shooting foul miss does not count as FGA.
 * And-1 make counts as both FGA and FGM.
 */
export function shotAttemptFlags(input: {
  made: boolean;
  fouledOnShot: boolean;
}): { countsAsFga: boolean; andOne: boolean } {
  if (input.fouledOnShot && !input.made) {
    return { countsAsFga: false, andOne: false };
  }
  if (input.fouledOnShot && input.made) {
    return { countsAsFga: true, andOne: true };
  }
  return { countsAsFga: true, andOne: false };
}
