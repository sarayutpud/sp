import {
  attackSideForPeriod,
  isInBonus,
  isPlayerFouledOut,
  shotAttemptFlags,
} from "@sp/rules-engine";
import type {
  BasketSide,
  FoulKind,
  Hlc,
  PlayByPlayEvent,
  ReboundKind,
} from "@sp/shared-types";
import { createHlc } from "@sp/sync-protocol";
import { ShotChart, type ShotChartClick } from "@sp/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { PreGameScreen } from "./PreGameScreen";
import { th } from "./i18n/th";
import { exportGameExcel, exportGamePdf } from "./lib/excel";
import {
  type ActiveGameSession,
  type OnCourtPlayer,
  applySub,
  bumpPlayerFoul,
  clearSession,
  endPeriod,
  loadSession,
  saveSession,
  sideForPlayer,
  teamIdForSide,
} from "./lib/game-session";
import {
  astEvent,
  blkEvent,
  foulDrawnEvent,
  foulEvent,
  ftEvent,
  nextHlc,
  periodEndEvent,
  rebEvent,
  shotEvent,
  stlEvent,
  subEvent,
  toEvent,
} from "./lib/live-events";
import { type LocalStore, createLocalStore } from "./lib/local-store";
import { saveBlob } from "./lib/save-download";
import { pushOutbox } from "./lib/sync-client";

type Wizard =
  | { step: "idle" }
  | { step: "outcome"; shot: ShotChartClick }
  | { step: "player"; shot: ShotChartClick; made: boolean }
  | {
      step: "assist";
      shot: ShotChartClick;
      playerId: string;
      side: "HOME" | "AWAY";
    }
  | {
      step: "afterMiss";
      shot: ShotChartClick;
      playerId: string;
      side: "HOME" | "AWAY";
      shotEventId: string;
    }
  | {
      step: "rebPlayer";
      kind: ReboundKind;
      shotEventId: string;
      side: "HOME" | "AWAY";
    }
  | { step: "foulPlayer" }
  | { step: "foulKind"; playerId: string; side: "HOME" | "AWAY" }
  | {
      step: "foulDrawn";
      playerId: string;
      side: "HOME" | "AWAY";
      kind: FoulKind;
    }
  | { step: "ftPlayer" }
  | { step: "ftCount"; playerId: string; side: "HOME" | "AWAY" }
  | {
      step: "ft";
      playerId: string;
      side: "HOME" | "AWAY";
      attemptNo: number;
      ofAttempts: number;
    }
  | { step: "subOut" }
  | { step: "subIn"; playerOutId: string }
  | { step: "steal" }
  | { step: "block" };

const DEVICE_ID = "courtside-web-dev";
const FOUL_OUT = 5;
const BONUS_AT = 5;

function foulClass(fouls: number): string {
  if (fouls >= FOUL_OUT) return "foul-out";
  if (fouls >= 4) return "foul-warn";
  return "";
}

function PlayerChipBtn({
  jersey,
  name,
  fouls,
  onClick,
  disabled,
  className,
}: {
  jersey: string;
  name: string;
  fouls?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const fc = fouls != null ? foulClass(fouls) : "";
  return (
    <button
      type="button"
      className={`player-chip ${fc} ${className ?? ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="player-chip-num">{jersey}</span>
      <span className="player-chip-name">{name}</span>
      {fouls != null && (
        <span className="player-chip-fouls" aria-label={`fouls ${fouls}`}>
          {["foul-1", "foul-2", "foul-3", "foul-4", "foul-5"].map((key, i) => (
            <i key={key} className={i < fouls ? "on" : ""} />
          ))}
        </span>
      )}
    </button>
  );
}

function PlayerPickGrid({
  players,
  onPick,
  disabled,
  tone,
}: {
  players: OnCourtPlayer[];
  onPick: (id: string) => void;
  disabled?: (p: OnCourtPlayer) => boolean;
  tone?: "home" | "away";
}) {
  return (
    <div className={`player-pick-grid${tone ? ` tone-${tone}` : ""}`}>
      {players.map((p) => (
        <PlayerChipBtn
          key={p.id}
          jersey={p.jerseyNumber}
          name={p.name}
          fouls={p.fouls}
          disabled={disabled?.(p)}
          className={tone ? `tone-${tone}` : undefined}
          onClick={() => onPick(p.id)}
        />
      ))}
    </div>
  );
}

function DualTeamPick({
  session,
  onPick,
  disabled,
  onlySide,
  excludePlayerId,
}: {
  session: ActiveGameSession;
  onPick: (id: string, side: "HOME" | "AWAY") => void;
  disabled?: (p: OnCourtPlayer) => boolean;
  onlySide?: "HOME" | "AWAY";
  excludePlayerId?: string;
}) {
  const sides = (onlySide ? [onlySide] : (["HOME", "AWAY"] as const)).filter(
    Boolean,
  ) as ("HOME" | "AWAY")[];
  return (
    <div className="dual-team-pick">
      {sides.map((side) => {
        const players = session.teams[side].onCourt.filter(
          (p) => p.id !== excludePlayerId,
        );
        const tone = side === "HOME" ? "home" : "away";
        const label =
          side === "HOME"
            ? `${session.homeTeamCode} · ${th.sideHome}`
            : `${session.awayTeamCode} · ${th.sideAway}`;
        return (
          <div key={side} className={`dual-team-block tone-${tone}`}>
            <p className="dual-team-label">{label}</p>
            <PlayerPickGrid
              players={players}
              tone={tone}
              disabled={disabled}
              onPick={(id) => onPick(id, side)}
            />
          </div>
        );
      })}
    </div>
  );
}

function eventLabel(e: PlayByPlayEvent, session: ActiveGameSession | null): string {
  const code =
    e.teamId && session
      ? e.teamId === session.homeTeamId
        ? session.homeTeamCode
        : e.teamId === session.awayTeamId
          ? session.awayTeamCode
          : ""
      : "";
  const prefix = code ? `${code} ` : "";
  const p = e.payload as Record<string, unknown>;
  if (e.type === "SHOT") return `${prefix}SHOT ${p.made ? "เข้า" : "ไม่เข้า"}`;
  if (e.type === "FT")
    return `${prefix}FT ${p.made ? "เข้า" : "ไม่เข้า"} ${p.attemptNo}/${p.ofAttempts}`;
  if (e.type === "FOUL") return `${prefix}FOUL ${String(p.kind ?? "")}`;
  if (e.type === "FOUL_DRAWN") return `${prefix}FD`;
  if (e.type === "REB") return `${prefix}REB ${String(p.kind ?? "")}`;
  if (e.type === "SUB") return `${prefix}SUB`;
  return `${prefix}${e.type}`;
}

export function App() {
  const [store, setStore] = useState<LocalStore | null>(null);
  const [session, setSession] = useState<ActiveGameSession | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [events, setEvents] = useState<PlayByPlayEvent[]>([]);
  const [hlc, setHlc] = useState<Hlc>(() => createHlc(DEVICE_ID));
  const [wizard, setWizard] = useState<Wizard>({ step: "idle" });
  const [lastSynced, setLastSynced] = useState<string>("—");
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [showMoreFouls, setShowMoreFouls] = useState(false);
  const syncingRef = useRef(false);

  const gameId = session?.gameId ?? "";
  const basketSide: BasketSide = useMemo(() => {
    if (!session) return "LEFT";
    const isHome = session.activeSide === "HOME";
    return attackSideForPeriod(session.homeAttackSide, session.period, isHome);
  }, [session]);
  const onCourt = session ? session.teams[session.activeSide].onCourt : [];
  const bench = session ? session.teams[session.activeSide].bench : [];
  const scores = useMemo(() => {
    const scoreFor = (teamId: string) =>
      events.reduce((total, event) => {
        if (event.teamId !== teamId || event.voidedAt) return total;
        const payload = event.payload as { made?: boolean; isThree?: boolean };
        if (!payload.made) return total;
        return (
          total +
          (event.type === "FT"
            ? 1
            : event.type === "SHOT"
              ? payload.isThree
                ? 3
                : 2
              : 0)
        );
      }, 0);
    return session
      ? {
          home: scoreFor(session.homeTeamId),
          away: scoreFor(session.awayTeamId),
        }
      : { home: 0, away: 0 };
  }, [events, session]);

  const refresh = useCallback(async (s: LocalStore, activeGameId: string) => {
    if (!activeGameId) {
      setEvents([]);
      setPending(await s.pendingCount());
      return;
    }
    const list = await s.listEvents(activeGameId);
    setEvents(list);
    setPending(await s.pendingCount());
    const synced = await s.getMeta("last_synced_at");
    setLastSynced(synced ? new Date(synced).toLocaleTimeString("th-TH") : "—");
  }, []);

  const persistSession = useCallback(
    async (next: ActiveGameSession) => {
      setSession(next);
      if (store) await saveSession(store, next);
    },
    [store],
  );

  const appendAndRefresh = useCallback(
    async (event: PlayByPlayEvent, nextSession?: ActiveGameSession) => {
      if (!store) return;
      await store.appendEvent(event);
      if (nextSession) await persistSession(nextSession);
      await refresh(store, event.gameId);
    },
    [store, persistSession, refresh],
  );

  const syncNow = useCallback(
    async (auto = false) => {
      if (!store || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const result = await pushOutbox(store, session);
        if (gameId) await refresh(store, gameId);
        if (result.ok) {
          setSyncMsg(
            auto
              ? `${th.autoSynced} +${result.inserted}`
              : `ซิงก์แล้ว +${result.inserted} (ข้าม ${result.skipped})`,
          );
        } else {
          setSyncMsg(`ซิงก์ไม่สำเร็จ: ${result.error}`);
        }
      } finally {
        syncingRef.current = false;
      }
    },
    [store, session, gameId, refresh],
  );

  useEffect(() => {
    let cancelled = false;
    createLocalStore().then(async (s) => {
      if (cancelled) return;
      setStore(s);
      const saved = await loadSession(s);
      if (saved) {
        setSession(saved);
        await refresh(s, saved.gameId);
      }
    });
    const onOnline = () => {
      setOnline(true);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  // Auto-sync when coming online with pending items
  useEffect(() => {
    if (!online || !store || !session || pending <= 0) return;
    const t = window.setTimeout(() => void syncNow(true), 400);
    return () => window.clearTimeout(t);
  }, [online, store, session, pending, syncNow]);

  useEffect(() => {
    if (!syncMsg) return;
    const t = window.setTimeout(() => setSyncMsg(""), 3200);
    return () => window.clearTimeout(t);
  }, [syncMsg]);

  const handleStartGame = useCallback(
    async (next: ActiveGameSession) => {
      setSession(next);
      setWizard({ step: "idle" });
      setSyncMsg("");
      if (store) await refresh(store, next.gameId);
    },
    [store, refresh],
  );

  const handleChangeGame = useCallback(async () => {
    if (!store) return;
    const ok = window.confirm(
      "เปลี่ยนแมตช์? ข้อมูลในเครื่องของแมตช์นี้ยังอยู่ — สามารถกลับมาเลือกแมตช์เดิมได้",
    );
    if (!ok) return;
    await clearSession(store);
    setSession(null);
    setEvents([]);
    setWizard({ step: "idle" });
    setSyncMsg("");
  }, [store]);

  const undo = useCallback(async () => {
    if (!store || !gameId) return;
    await store.removeLastEvent(gameId);
    await refresh(store, gameId);
    setWizard({ step: "idle" });
  }, [store, gameId, refresh]);

  useHotkeys("ctrl+z", (e) => {
    e.preventDefault();
    void undo();
  });
  useHotkeys("escape", () => setWizard({ step: "idle" }));
  useHotkeys("h", () => {
    if (wizard.step !== "idle") return;
    if (session) void persistSession({ ...session, activeSide: "HOME" });
  });
  useHotkeys("a", () => {
    if (wizard.step !== "idle") return;
    if (session) void persistSession({ ...session, activeSide: "AWAY" });
  });
  useHotkeys("1,2,3,4,5", (e) => {
    if (!session || wizard.step === "idle" || wizard.step === "outcome") return;
    const idx = Number(e.key) - 1;
    if (!onCourt[idx]) return;
    e.preventDefault();
    const btn = document.querySelector<HTMLButtonElement>(
      `.player-pick-grid .player-chip:nth-child(${idx + 1}):not(:disabled)`,
    );
    btn?.click();
  });

  const tick = useCallback(() => {
    const n = nextHlc(hlc);
    setHlc(n);
    return n;
  }, [hlc]);

  const finishShotMade = useCallback(
    async (shot: ShotChartClick, playerId: string, side: "HOME" | "AWAY", assistId: string | null) => {
      if (!store || !session) return;
      const teamId = teamIdForSide(session, side);
      const flags = shotAttemptFlags({ made: true, fouledOnShot: false });
      const h = tick();
      const event = shotEvent(
        session,
        h,
        shot,
        true,
        playerId,
        flags,
        assistId,
        teamId,
      );
      await store.appendEvent(event);
      if (assistId) {
        const h2 = nextHlc(h);
        setHlc(h2);
        await store.appendEvent(astEvent(session, h2, assistId, teamId));
      }
      await refresh(store, session.gameId);
      setWizard({ step: "idle" });
    },
    [store, session, tick, refresh],
  );

  const persistShotMissThen = useCallback(
    async (shot: ShotChartClick, playerId: string, side: "HOME" | "AWAY") => {
      if (!store || !session) return;
      const teamId = teamIdForSide(session, side);
      const flags = shotAttemptFlags({ made: false, fouledOnShot: false });
      const h = tick();
      const event = shotEvent(session, h, shot, false, playerId, flags, null, teamId);
      await store.appendEvent(event);
      await refresh(store, session.gameId);
      setWizard({
        step: "afterMiss",
        shot,
        playerId,
        side,
        shotEventId: event.eventId,
      });
    },
    [store, session, tick, refresh],
  );

  const completeFoul = useCallback(
    async (
      playerId: string,
      side: "HOME" | "AWAY",
      kind: FoulKind,
      drawnPlayerId: string | null,
    ) => {
      if (!store || !session) return;
      const teamId = teamIdForSide(session, side);
      const h = tick();
      const foul = foulEvent(session, h, playerId, kind, teamId);
      const next = bumpPlayerFoul(session, playerId, side);
      await store.appendEvent(foul);
      if (drawnPlayerId) {
        const drawnSide = side === "HOME" ? "AWAY" : "HOME";
        const h2 = nextHlc(h);
        setHlc(h2);
        await store.appendEvent(
          foulDrawnEvent(
            session,
            h2,
            drawnPlayerId,
            teamIdForSide(session, drawnSide),
            foul.eventId,
          ),
        );
      }
      await persistSession(next);
      await refresh(store, session.gameId);
      setWizard({ step: "idle" });
      const fouls =
        next.teams[side].onCourt.find((p) => p.id === playerId)?.fouls ??
        next.teams[side].bench.find((p) => p.id === playerId)?.fouls ??
        0;
      if (isPlayerFouledOut(fouls, FOUL_OUT)) {
        setSyncMsg(th.fouledOut);
      } else if (isInBonus(next.teams[side].foulsPeriod, BONUS_AT)) {
        setSyncMsg(th.bonus);
      }
    },
    [store, session, tick, persistSession, refresh],
  );

  const recordFt = useCallback(
    async (made: boolean) => {
      if (!store || !session || wizard.step !== "ft") return;
      const { playerId, side, attemptNo, ofAttempts } = wizard;
      const h = tick();
      await appendAndRefresh(
        ftEvent(
          session,
          h,
          playerId,
          made,
          attemptNo,
          ofAttempts,
          teamIdForSide(session, side),
        ),
      );
      if (attemptNo >= ofAttempts) setWizard({ step: "idle" });
      else
        setWizard({
          step: "ft",
          playerId,
          side,
          attemptNo: attemptNo + 1,
          ofAttempts,
        });
    },
    [store, session, wizard, tick, appendAndRefresh],
  );

  const recordReb = useCallback(
    async (
      kind: ReboundKind,
      playerId: string,
      side: "HOME" | "AWAY",
      shotEventId: string,
    ) => {
      if (!store || !session) return;
      const h = tick();
      await appendAndRefresh(
        rebEvent(
          session,
          h,
          playerId,
          kind,
          shotEventId,
          teamIdForSide(session, side),
        ),
      );
      setWizard({ step: "idle" });
    },
    [store, session, tick, appendAndRefresh],
  );

  const recordTo = useCallback(
    async (playerId: string | null, side?: "HOME" | "AWAY") => {
      if (!store || !session) return;
      const h = tick();
      const teamId =
        side != null
          ? teamIdForSide(session, side)
          : playerId
            ? teamIdForSide(
                session,
                sideForPlayer(session, playerId) ?? session.activeSide,
              )
            : undefined;
      await appendAndRefresh(toEvent(session, h, playerId, teamId));
      setWizard({ step: "idle" });
    },
    [store, session, tick, appendAndRefresh],
  );

  const doSub = useCallback(
    async (playerOutId: string, playerInId: string) => {
      if (!store || !session) return;
      const h = tick();
      const next = applySub(session, playerOutId, playerInId);
      await store.appendEvent(subEvent(session, h, playerOutId, playerInId));
      await persistSession(next);
      await refresh(store, session.gameId);
      setWizard({ step: "idle" });
    },
    [store, session, tick, persistSession, refresh],
  );

  const doEndPeriod = useCallback(async () => {
    if (!store || !session) return;
    if (!window.confirm(`จบ ${th.periodLabel(session.period)}?`)) return;
    const h = tick();
    await store.appendEvent(periodEndEvent(session, h));
    await persistSession(endPeriod(session, scores.home, scores.away));
    await refresh(store, session.gameId);
    setWizard({ step: "idle" });
    setSyncMsg(`จบ ${th.periodLabel(session.period)} แล้ว`);
  }, [store, session, tick, persistSession, refresh, scores]);

  const backup = useCallback(async () => {
    if (!store || !gameId) return;
    const json = await store.exportBackupJson(gameId);
    const blob = new Blob([json], { type: "application/json" });
    const name = `sp-backup-${gameId.slice(0, 8)}.json`;
    const result = await saveBlob(blob, name);
    if (result === "saved") setSyncMsg(th.exportSaved(name));
    else if (result === "cancelled") setSyncMsg(th.exportCancelled);
    else setSyncMsg(th.exportFailed(result.error));
  }, [store, gameId]);

  const exportExcel = useCallback(async () => {
    if (!gameId) return;
    if (!session) return;
    const result = await exportGameExcel(events, session);
    if (result === "empty") {
      setSyncMsg(th.exportEmpty);
      return;
    }
    if (result === "saved") {
      setSyncMsg(th.exportSaved(`fiba-box-${gameId.slice(0, 8)}.xlsx`));
    } else if (result === "cancelled") {
      setSyncMsg(th.exportCancelled);
    } else {
      setSyncMsg(th.exportFailed(result.error));
    }
  }, [events, gameId, session]);

  const exportPdf = useCallback(async () => {
    if (!session) return;
    const result = await exportGamePdf(events, session);
    if (result === "empty") setSyncMsg(th.exportEmpty);
    else if (result === "saved")
      setSyncMsg(
        th.exportSaved(`iybc-match-box-${session.gameId.slice(0, 8)}.pdf`),
      );
    else if (result === "cancelled") setSyncMsg(th.exportCancelled);
    else setSyncMsg(th.exportFailed(result.error));
  }, [events, session]);

  const statusLabel = useMemo(() => {
    if (!online) return th.syncOffline;
    if (pending > 0) return th.syncPending(pending);
    return th.syncOnline;
  }, [online, pending]);

  const openWizard = useCallback((w: Wizard) => {
    setWizard(w);
  }, []);

  useHotkeys("f", () => {
    if (session && wizard.step === "idle") openWizard({ step: "foulPlayer" });
  });
  useHotkeys("t", () => {
    if (session && wizard.step === "idle") openWizard({ step: "ftPlayer" });
  });
  useHotkeys("u", () => {
    if (session && wizard.step === "idle") openWizard({ step: "subOut" });
  });
  useHotkeys("s", () => {
    if (session && wizard.step === "idle") openWizard({ step: "steal" });
  });
  useHotkeys("b", () => {
    if (session && wizard.step === "idle") openWizard({ step: "block" });
  });
  useHotkeys("r", () => {
    if (session && wizard.step === "idle")
      openWizard({
        step: "rebPlayer",
        kind: "DEFENSIVE",
        shotEventId: "",
        side: session.activeSide === "HOME" ? "AWAY" : "HOME",
      });
  });
  useHotkeys("o", () => {
    if (session && wizard.step === "idle")
      openWizard({
        step: "rebPlayer",
        kind: "OFFENSIVE",
        shotEventId: "",
        side: session.activeSide,
      });
  });
  useHotkeys("e", () => {
    if (session && wizard.step === "idle") void doEndPeriod();
  });

  if (!store) {
    return (
      <div className="shell">
        <p className="muted" style={{ padding: "2rem" }}>
          กำลังเปิด…
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand-wrap">
            <img className="brand-logo" src="/sp-logo.png" alt="SP FITNESS" />
            <div>
              <strong className="brand">{th.appTitle}</strong>
              <span className="brand-tag">FITNESS BANG SUE</span>
            </div>
          </div>
        </header>
        <PreGameScreen
          store={store}
          online={online}
          onStart={handleStartGame}
        />
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar topbar-compact">
        <div className="brand-wrap">
          <img className="brand-logo" src="/sp-logo.png" alt="SP FITNESS" />
          <div>
            <strong className="brand">{th.appTitle}</strong>
            <span className="brand-tag">FITNESS BANG SUE</span>
          </div>
        </div>
        <div className="sync" data-state={online ? "on" : "off"}>
          <span className="dot" />
          {statusLabel}
          <span className="muted">
            {" "}
            · {th.lastSynced}: {lastSynced}
          </span>
          <button
            type="button"
            className="btn tiny"
            onClick={() => void syncNow(false)}
          >
            ซิงก์
          </button>
          <a
            className="manual-link"
            href="/user-manual.html"
            target="_blank"
            rel="noreferrer"
          >
            คู่มือ
          </a>
        </div>
      </header>

      <div className="live-scoreboard">
        <button
          type="button"
          className={`live-side home ${session.activeSide === "HOME" ? "active" : ""}`}
          onClick={() => {
            if (wizard.step !== "idle") return;
            void persistSession({ ...session, activeSide: "HOME" });
          }}
        >
          <span className="live-code">{session.homeTeamCode}</span>
          <span className="live-name">{session.homeTeamName}</span>
          <span className="live-pts">{scores.home}</span>
        </button>
        <div className="live-mid">
          <span className="chip">{th.periodLabel(session.period)}</span>
          <span className="chip tone-home">
            {session.homeTeamCode} {th.teamFouls(session.teams.HOME.foulsPeriod)}
            {isInBonus(session.teams.HOME.foulsPeriod, BONUS_AT)
              ? ` · ${th.bonus}`
              : ""}
          </span>
          <span className="chip tone-away">
            {session.awayTeamCode} {th.teamFouls(session.teams.AWAY.foulsPeriod)}
            {isInBonus(session.teams.AWAY.foulsPeriod, BONUS_AT)
              ? ` · ${th.bonus}`
              : ""}
          </span>
          <span className="live-recording">
            {th.recordingSide}:{" "}
            {session.activeSide === "HOME"
              ? session.homeTeamCode
              : session.awayTeamCode}
          </span>
        </div>
        <button
          type="button"
          className={`live-side away ${session.activeSide === "AWAY" ? "active" : ""}`}
          onClick={() => {
            if (wizard.step !== "idle") return;
            void persistSession({ ...session, activeSide: "AWAY" });
          }}
        >
          <span className="live-code">{session.awayTeamCode}</span>
          <span className="live-name">{session.awayTeamName}</span>
          <span className="live-pts">{scores.away}</span>
        </button>
      </div>
      <div className="live-toolbar">
        <span className="muted live-hint">{th.scoreTapHint}</span>
        <div className="live-toolbar-actions">
          <button
            type="button"
            className="btn tiny"
            onClick={() => void doEndPeriod()}
          >
            {th.endPeriod}
          </button>
          <button
            type="button"
            className="btn tiny"
            onClick={() => void handleChangeGame()}
          >
            {th.changeGame}
          </button>
        </div>
      </div>

      <div className="action-bar action-bar-grid">
        <button
          type="button"
          className="btn danger"
          onClick={() => openWizard({ step: "foulPlayer" })}
        >
          {th.actionFoul}
          <kbd>F</kbd>
        </button>
        <button
          type="button"
          className="btn accent"
          onClick={() => openWizard({ step: "ftPlayer" })}
        >
          {th.actionFt}
          <kbd>T</kbd>
        </button>
        <button
          type="button"
          className="btn info"
          onClick={() => openWizard({ step: "subOut" })}
        >
          {th.actionSub}
          <kbd>U</kbd>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => openWizard({ step: "steal" })}
        >
          {th.actionSteal}
          <kbd>S</kbd>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => openWizard({ step: "block" })}
        >
          {th.actionBlock}
          <kbd>B</kbd>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            openWizard({
              step: "rebPlayer",
              kind: "DEFENSIVE",
              shotEventId: "",
              side: session.activeSide === "HOME" ? "AWAY" : "HOME",
            })
          }
        >
          {th.actionDreb}
          <kbd>R</kbd>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            openWizard({
              step: "rebPlayer",
              kind: "OFFENSIVE",
              shotEventId: "",
              side: session.activeSide,
            })
          }
        >
          {th.actionOreb}
          <kbd>O</kbd>
        </button>
      </div>

      <main className="main">
        <section
          className={`court-panel${wizard.step === "idle" ? " awaiting-shot" : ""}`}
        >
          <div className="oncourt-strip">
            <span className="oncourt-strip-label">{th.onCourtStrip}</span>
            {onCourt.map((p) => (
              <PlayerChipBtn
                key={p.id}
                jersey={p.jerseyNumber}
                name={p.name}
                fouls={p.fouls}
                className="player-chip-static"
                disabled
              />
            ))}
          </div>
          {wizard.step === "idle" && (
            <>
              <h1>{th.shotPrompt}</h1>
              <p className="muted court-hotkey-hint">{th.hotkeyHint}</p>
            </>
          )}
          <div className="court-chart-wrap">
            <ShotChart
              basketSide={basketSide}
              onShot={(shot) => openWizard({ step: "outcome", shot })}
            />
          </div>
        </section>

        <aside className="side">
          <div className="card">
            <h2>อีเวนต์ล่าสุด ({events.length})</h2>
            <ol className="log">
              {[...events]
                .reverse()
                .slice(0, 10)
                .map((e) => (
                  <li key={e.eventId}>{eventLabel(e, session)}</li>
                ))}
            </ol>
            <div className="row">
              <button type="button" className="btn" onClick={() => void undo()}>
                {th.undo}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void exportExcel()}
              >
                {th.exportExcel}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void exportPdf()}
              >
                {th.exportPdf}
              </button>
            </div>
            <button
              type="button"
              className="btn block"
              onClick={() => void backup()}
            >
              {th.backup}
            </button>
          </div>
        </aside>
      </main>

      {wizard.step !== "idle" && (
        <div className="wizard-overlay">
          <button
            type="button"
            className="wizard-backdrop"
            aria-label={th.cancel}
            onClick={() => setWizard({ step: "idle" })}
          />
          <div className="wizard-sheet">
            {wizard.step === "outcome" && (
              <>
                <p>
                  {wizard.shot.isThree ? "3PT" : "2PT"} @ (
                  {wizard.shot.x.toFixed(2)}, {wizard.shot.y.toFixed(2)})
                </p>
                <div className="row outcome-row">
                  <button
                    type="button"
                    className="btn primary outcome-btn"
                    onClick={() =>
                      openWizard({
                        step: "player",
                        shot: wizard.shot,
                        made: true,
                      })
                    }
                  >
                    {th.made}
                  </button>
                  <button
                    type="button"
                    className="btn outcome-btn"
                    onClick={() =>
                      openWizard({
                        step: "player",
                        shot: wizard.shot,
                        made: false,
                      })
                    }
                  >
                    {th.missed}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setWizard({ step: "idle" })}
                  >
                    {th.cancel}
                  </button>
                </div>
              </>
            )}

            {wizard.step === "player" && session && (
              <>
                <h2>{th.selectPlayerBoth}</h2>
                <DualTeamPick
                  session={session}
                  onPick={(id, side) => {
                    if (wizard.made) {
                      openWizard({
                        step: "assist",
                        shot: wizard.shot,
                        playerId: id,
                        side,
                      });
                    } else {
                      void persistShotMissThen(wizard.shot, id, side);
                    }
                  }}
                />
              </>
            )}

            {wizard.step === "assist" && session && (
              <>
                <h2>{th.assistPrompt}</h2>
                <button
                  type="button"
                  className="btn block primary"
                  onClick={() =>
                    void finishShotMade(
                      wizard.shot,
                      wizard.playerId,
                      wizard.side,
                      null,
                    )
                  }
                >
                  {th.noAssist}
                </button>
                <DualTeamPick
                  session={session}
                  onlySide={wizard.side}
                  excludePlayerId={wizard.playerId}
                  onPick={(id) =>
                    void finishShotMade(
                      wizard.shot,
                      wizard.playerId,
                      wizard.side,
                      id,
                    )
                  }
                />
              </>
            )}

            {wizard.step === "afterMiss" && (
              <>
                <h2>{th.afterMiss}</h2>
                <button
                  type="button"
                  className="btn block primary"
                  onClick={() =>
                    openWizard({
                      step: "rebPlayer",
                      kind: "OFFENSIVE",
                      shotEventId: wizard.shotEventId,
                      side: wizard.side,
                    })
                  }
                >
                  {th.oreb}
                </button>
                <button
                  type="button"
                  className="btn block"
                  onClick={() =>
                    openWizard({
                      step: "rebPlayer",
                      kind: "DEFENSIVE",
                      shotEventId: wizard.shotEventId,
                      side: wizard.side === "HOME" ? "AWAY" : "HOME",
                    })
                  }
                >
                  {th.dreb}
                </button>
                <button
                  type="button"
                  className="btn block"
                  onClick={() => void recordTo(wizard.playerId, wizard.side)}
                >
                  {th.turnover}
                </button>
              </>
            )}

            {wizard.step === "rebPlayer" && session && (
              <>
                <h2>
                  {th.selectRebPlayer} —{" "}
                  {wizard.kind === "OFFENSIVE" ? th.oreb : th.dreb}
                </h2>
                <DualTeamPick
                  session={session}
                  onlySide={wizard.side}
                  onPick={(id, side) =>
                    void recordReb(wizard.kind, id, side, wizard.shotEventId)
                  }
                />
              </>
            )}

            {wizard.step === "foulPlayer" && session && (
              <>
                <h2>{th.foulSelectPlayer}</h2>
                <DualTeamPick
                  session={session}
                  disabled={(p) => isPlayerFouledOut(p.fouls, FOUL_OUT)}
                  onPick={(id, side) =>
                    openWizard({ step: "foulKind", playerId: id, side })
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setWizard({ step: "idle" })}
                >
                  {th.cancel}
                </button>
              </>
            )}

            {wizard.step === "foulKind" && (
              <>
                <h2>{th.foulSelectKind}</h2>
                <div className="row">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      openWizard({
                        step: "foulDrawn",
                        playerId: wizard.playerId,
                        side: wizard.side,
                        kind: "PERSONAL",
                      })
                    }
                  >
                    {th.foulPersonal}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      openWizard({
                        step: "foulDrawn",
                        playerId: wizard.playerId,
                        side: wizard.side,
                        kind: "SHOOTING",
                      })
                    }
                  >
                    {th.foulShooting}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowMoreFouls((v) => !v)}
                  >
                    {th.foulMore}
                  </button>
                </div>
                {showMoreFouls && (
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        void completeFoul(
                          wizard.playerId,
                          wizard.side,
                          "TECHNICAL",
                          null,
                        )
                      }
                    >
                      {th.foulTechnical}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        openWizard({
                          step: "foulDrawn",
                          playerId: wizard.playerId,
                          side: wizard.side,
                          kind: "UNSPORTSMANLIKE",
                        })
                      }
                    >
                      {th.foulUnsportsmanlike}
                    </button>
                  </div>
                )}
              </>
            )}

            {wizard.step === "foulDrawn" && session && (
              <>
                <h2>{th.foulSelectDrawn}</h2>
                <button
                  type="button"
                  className="btn block"
                  onClick={() =>
                    void completeFoul(
                      wizard.playerId,
                      wizard.side,
                      wizard.kind,
                      null,
                    )
                  }
                >
                  {th.foulSkipDrawn}
                </button>
                <DualTeamPick
                  session={session}
                  onlySide={wizard.side === "HOME" ? "AWAY" : "HOME"}
                  onPick={(id) =>
                    void completeFoul(
                      wizard.playerId,
                      wizard.side,
                      wizard.kind,
                      id,
                    )
                  }
                />
              </>
            )}

            {wizard.step === "ftPlayer" && session && (
              <>
                <h2>{th.ftSelectPlayer}</h2>
                <DualTeamPick
                  session={session}
                  onPick={(id, side) =>
                    openWizard({ step: "ftCount", playerId: id, side })
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setWizard({ step: "idle" })}
                >
                  {th.cancel}
                </button>
              </>
            )}

            {wizard.step === "ftCount" && (
              <>
                <h2>{th.ftSelectCount}</h2>
                <div className="row">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        openWizard({
                          step: "ft",
                          playerId: wizard.playerId,
                          side: wizard.side,
                          attemptNo: 1,
                          ofAttempts: n,
                        })
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}

            {wizard.step === "ft" && (
              <>
                <h2>{th.ftPrompt(wizard.attemptNo, wizard.ofAttempts)}</h2>
                <div className="row">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => void recordFt(true)}
                  >
                    {th.made}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void recordFt(false)}
                  >
                    {th.missed}
                  </button>
                </div>
              </>
            )}

            {wizard.step === "subOut" && (
              <>
                <h2>{th.subOut}</h2>
                <PlayerPickGrid
                  players={onCourt}
                  onPick={(id) =>
                    openWizard({ step: "subIn", playerOutId: id })
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setWizard({ step: "idle" })}
                >
                  {th.cancel}
                </button>
              </>
            )}

            {wizard.step === "subIn" && (
              <>
                <h2>{th.subIn}</h2>
                {bench.length === 0 && (
                  <p className="muted">ไม่มีตัวสำรองในรายชื่อ</p>
                )}
                <PlayerPickGrid
                  players={bench}
                  disabled={(p) => isPlayerFouledOut(p.fouls, FOUL_OUT)}
                  onPick={(id) => void doSub(wizard.playerOutId, id)}
                />
              </>
            )}

            {wizard.step === "steal" && session && (
              <>
                <h2>{th.selectSteal}</h2>
                <DualTeamPick
                  session={session}
                  onPick={(id, side) => {
                    const h = tick();
                    void appendAndRefresh(
                      stlEvent(session, h, id, teamIdForSide(session, side)),
                    ).then(() => setWizard({ step: "idle" }));
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setWizard({ step: "idle" })}
                >
                  {th.cancel}
                </button>
              </>
            )}

            {wizard.step === "block" && session && (
              <>
                <h2>{th.selectBlock}</h2>
                <DualTeamPick
                  session={session}
                  onPick={(id, side) => {
                    const h = tick();
                    void appendAndRefresh(
                      blkEvent(session, h, id, teamIdForSide(session, side)),
                    ).then(() => setWizard({ step: "idle" }));
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setWizard({ step: "idle" })}
                >
                  {th.cancel}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {syncMsg && (
        <button type="button" className="toast" onClick={() => setSyncMsg("")}>
          {syncMsg}
        </button>
      )}
    </div>
  );
}
