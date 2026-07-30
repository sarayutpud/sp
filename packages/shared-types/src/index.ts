import { z } from "zod";

/** Full Day-1 event taxonomy — UI may not expose every type in Phase 1 */
export const EventTypeSchema = z.enum([
  "SHOT",
  "FT",
  "REB",
  "AST",
  "BLK",
  "STL",
  "TO",
  "FOUL",
  "FOUL_DRAWN",
  "SUB",
  "TIMEOUT",
  "PERIOD_START",
  "PERIOD_END",
  "JUMP_BALL",
  "POSSESSION_ARROW",
  "CLOCK",
  "VOID",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const ReboundKindSchema = z.enum(["OFFENSIVE", "DEFENSIVE", "TEAM"]);
export type ReboundKind = z.infer<typeof ReboundKindSchema>;

export const FoulKindSchema = z.enum([
  "PERSONAL",
  "SHOOTING",
  "TECHNICAL",
  "UNSPORTSMANLIKE",
  "DISQUALIFYING",
]);
export type FoulKind = z.infer<typeof FoulKindSchema>;

export const ShotTypeSchema = z.enum([
  "JUMP_SHOT",
  "LAYUP",
  "DUNK",
  "TIP_IN",
  "HOOK",
  "EURO_STEP",
  "FLOATER",
  "OTHER",
]);
export type ShotType = z.infer<typeof ShotTypeSchema>;

export const BasketSideSchema = z.enum(["LEFT", "RIGHT"]);
export type BasketSide = z.infer<typeof BasketSideSchema>;

export const GameStatusSchema = z.enum([
  "scheduled",
  "tipoff",
  "live",
  "period_break",
  "final",
  "official",
]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const ThreePtProfileSchema = z.enum(["FIBA_FULL", "FIBA_3X3", "CUSTOM"]);
export type ThreePtProfile = z.infer<typeof ThreePtProfileSchema>;

export const HlcSchema = z.object({
  wallMs: z.number().int().nonnegative(),
  logical: z.number().int().nonnegative(),
  deviceId: z.string().min(1),
});
export type Hlc = z.infer<typeof HlcSchema>;

export const ShotPayloadSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  basketSide: BasketSideSchema,
  isThree: z.boolean(),
  made: z.boolean(),
  shotType: ShotTypeSchema,
  assistedByPlayerId: z.string().uuid().nullable().optional(),
  /** Shooting foul miss: not an FGA */
  countsAsFga: z.boolean().default(true),
  andOne: z.boolean().default(false),
});
export type ShotPayload = z.infer<typeof ShotPayloadSchema>;

export const PlayByPlayEventSchema = z.object({
  eventId: z.string().uuid(),
  gameId: z.string().uuid(),
  period: z.number().int().positive(),
  clockMs: z.number().int().nonnegative().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  playerId: z.string().uuid().nullable().optional(),
  type: EventTypeSchema,
  hlc: HlcSchema,
  payload: z.record(z.unknown()).default({}),
  voidedAt: z.string().datetime().nullable().optional(),
  voidReason: z.string().nullable().optional(),
  voidedByEventId: z.string().uuid().nullable().optional(),
});
export type PlayByPlayEvent = z.infer<typeof PlayByPlayEventSchema>;

export const RulesetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  periodCount: z.number().int().positive().default(4),
  periodLengthMs: z.number().int().positive().default(10 * 60 * 1000),
  otLengthMs: z.number().int().positive().default(5 * 60 * 1000),
  foulOutCount: z.number().int().positive().default(5),
  teamFoulsBonusAt: z.number().int().positive().default(5),
  threePtProfile: ThreePtProfileSchema.default("FIBA_FULL"),
});
export type Ruleset = z.infer<typeof RulesetSchema>;

export const OnCourtSlotSchema = z.object({
  gameId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  slot: z.number().int().min(1).max(5),
});
export type OnCourtSlot = z.infer<typeof OnCourtSlotSchema>;

export const GameStateSchema = z.object({
  gameId: z.string().uuid(),
  status: GameStatusSchema,
  period: z.number().int().positive(),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  possessionTeamId: z.string().uuid().nullable(),
  possessionArrowTeamId: z.string().uuid().nullable(),
  /** Which side the home team attacks in period 1 */
  homeAttackSidePeriod1: BasketSideSchema,
  homeTeamFoulsPeriod: z.number().int().nonnegative(),
  awayTeamFoulsPeriod: z.number().int().nonnegative(),
});
export type GameState = z.infer<typeof GameStateSchema>;

/** TCP feed message types — CLOCK and EVENT stay separate */
export const SpFeedMessageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("EVENT"),
    version: z.literal("sp-feed/v1"),
    gameId: z.string().uuid(),
    event: PlayByPlayEventSchema,
  }),
  z.object({
    kind: z.literal("CLOCK"),
    version: z.literal("sp-feed/v1"),
    gameId: z.string().uuid(),
    period: z.number().int().positive(),
    clockMs: z.number().int().nonnegative(),
    running: z.boolean(),
  }),
  z.object({
    kind: z.literal("HEARTBEAT"),
    version: z.literal("sp-feed/v1"),
    ts: z.number().int(),
  }),
]);
export type SpFeedMessage = z.infer<typeof SpFeedMessageSchema>;

export const DeltaPushEnvelopeSchema = z.object({
  deviceId: z.string().min(1),
  events: z.array(PlayByPlayEventSchema).min(1),
});
export type DeltaPushEnvelope = z.infer<typeof DeltaPushEnvelopeSchema>;
