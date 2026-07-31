import { describe, expect, it } from "vitest";
import { spuBanFixture } from "./match-box-score.fixture";
import {
  buildMatchBoxScore,
  fmtMadeAtt,
  type MatchPlayerMeta,
} from "./match-box-score";
import type { PlayByPlayEvent } from "@sp/shared-types";

describe("match box score", () => {
  it("fixture finals and quarters align", () => {
    expect(spuBanFixture.meta.finalHome).toBe(67);
    expect(spuBanFixture.meta.finalAway).toBe(88);
    const last = spuBanFixture.byQuarter.at(-1);
    expect(last?.homeCum).toBe(67);
    expect(last?.awayCum).toBe(88);
    expect(fmtMadeAtt(spuBanFixture.home.players[0]!.fg2)).toBe("3/8");
  });

  it("aggregates two teams from PBP", () => {
    const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
    const awayId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02";
    const pHome = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";
    const pAway = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02";
    const players: MatchPlayerMeta[] = [
      {
        id: pHome,
        teamId: homeId,
        displayName: "Home Star",
        jerseyNumber: "1",
      },
      {
        id: pAway,
        teamId: awayId,
        displayName: "Away Star",
        jerseyNumber: "2",
      },
    ];
    const hlc = { wallMs: 1, logical: 1, deviceId: "t" };
    const events: PlayByPlayEvent[] = [
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
        gameId: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
        period: 1,
        teamId: homeId,
        playerId: pHome,
        type: "SHOT",
        hlc,
        payload: { made: true, isThree: false, countsAsFga: true },
      },
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
        gameId: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
        period: 1,
        teamId: awayId,
        playerId: pAway,
        type: "SHOT",
        hlc,
        payload: { made: true, isThree: true, countsAsFga: true },
      },
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc03",
        gameId: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
        period: 1,
        teamId: homeId,
        playerId: pHome,
        type: "FT",
        hlc,
        payload: { made: true },
      },
    ];

    const box = buildMatchBoxScore(
      events,
      players,
      {
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeName: "Home",
        awayName: "Away",
        homeCode: "HOM",
        awayCode: "AWY",
      },
      [{ period: 1, homePoints: 3, awayPoints: 3 }],
    );

    expect(box.home.teamTotals.pts).toBe(3);
    expect(box.away.teamTotals.pts).toBe(3);
    expect(box.home.players[0]?.fg2).toEqual({ made: 1, att: 1 });
    expect(box.away.players[0]?.fg3).toEqual({ made: 1, att: 1 });
    expect(box.meta.finalHome).toBe(3);
    expect(box.home.players[0]?.ef).toBe(
      3 + 0 + 0 + 0 + 0 - 0 - 0 - 0,
    );
  });

  it("counts FOUL_DRAWN and plus/minus from starters", () => {
    const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
    const awayId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02";
    const h1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";
    const h2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03";
    const a1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02";
    const a2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04";
    const players: MatchPlayerMeta[] = [
      { id: h1, teamId: homeId, displayName: "H1", jerseyNumber: "1" },
      { id: h2, teamId: homeId, displayName: "H2", jerseyNumber: "2" },
      { id: a1, teamId: awayId, displayName: "A1", jerseyNumber: "3" },
      { id: a2, teamId: awayId, displayName: "A2", jerseyNumber: "4" },
    ];
    const hlc = { wallMs: 1, logical: 1, deviceId: "t" };
    const gameId = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
    const events: PlayByPlayEvent[] = [
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc11",
        gameId,
        period: 1,
        teamId: homeId,
        playerId: h1,
        type: "SHOT",
        hlc: { ...hlc, wallMs: 1 },
        payload: { made: true, isThree: false, countsAsFga: true },
      },
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc12",
        gameId,
        period: 1,
        teamId: awayId,
        playerId: a1,
        type: "FOUL",
        hlc: { ...hlc, wallMs: 2 },
        payload: { kind: "PERSONAL" },
      },
      {
        eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccc13",
        gameId,
        period: 1,
        teamId: homeId,
        playerId: h1,
        type: "FOUL_DRAWN",
        hlc: { ...hlc, wallMs: 3 },
        payload: {},
      },
    ];
    const box = buildMatchBoxScore(events, players, {
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeName: "Home",
      awayName: "Away",
      homeCode: "HOM",
      awayCode: "AWY",
      homeStarters: [h1, h2],
      awayStarters: [a1, a2],
    });
    expect(box.home.players.find((p) => p.playerId === h1)?.fd).toBe(1);
    expect(box.home.players.find((p) => p.playerId === h1)?.plusMinus).toBe(2);
    expect(box.home.players.find((p) => p.playerId === h2)?.plusMinus).toBe(2);
    expect(box.away.players.find((p) => p.playerId === a1)?.plusMinus).toBe(-2);
  });
});
