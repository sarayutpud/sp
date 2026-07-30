import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const playByPlay = pgTable("play_by_play", {
  eventId: uuid("event_id").primaryKey(),
  gameId: uuid("game_id").notNull(),
  period: integer("period").notNull(),
  clockMs: integer("clock_ms"),
  teamId: uuid("team_id"),
  playerId: uuid("player_id"),
  type: text("type").notNull(),
  hlc: jsonb("hlc").notNull(),
  payload: jsonb("payload").notNull().default({}),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidReason: text("void_reason"),
  voidedByEventId: uuid("voided_by_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id").notNull(),
  homeTeamId: uuid("home_team_id").notNull(),
  awayTeamId: uuid("away_team_id").notNull(),
  status: text("status").notNull().default("scheduled"),
  rosterLocked: integer("roster_locked"),
});
