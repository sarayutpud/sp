import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { DeltaPushEnvelopeSchema } from "@sp/shared-types";
import { SyncService } from "./sync.service";

@Controller()
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  @Get("health")
  health() {
    return { ok: true, service: "sp-api", ts: Date.now() };
  }

  @Post("v1/sync/push")
  push(@Body() body: unknown) {
    const envelope = DeltaPushEnvelopeSchema.parse(body);
    return this.sync.pushDelta(envelope);
  }

  @Get("v1/games/:gameId/pbp")
  pullPbp(
    @Param("gameId") gameId: string,
    @Query("since") since?: string,
  ) {
    return this.sync.pullPbp(gameId, since);
  }
}
