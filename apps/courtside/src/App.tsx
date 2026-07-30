import { shotAttemptFlags } from "@sp/rules-engine";
import type { BasketSide, Hlc, PlayByPlayEvent } from "@sp/shared-types";
import { createHlc, tickHlc } from "@sp/sync-protocol";
import { ShotChart, type ShotChartClick } from "@sp/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { PreGameScreen } from "./PreGameScreen";
import { th } from "./i18n/th";
import { exportGameExcel } from "./lib/excel";
import {
  type ActiveGameSession,
  clearSession,
  loadSession,
} from "./lib/game-session";
import { type LocalStore, createLocalStore } from "./lib/local-store";
import { saveBlob } from "./lib/save-download";
import { pushOutbox } from "./lib/sync-client";

type Wizard =
  | { step: "idle" }
  | { step: "outcome"; shot: ShotChartClick }
  | { step: "player"; shot: ShotChartClick; made: boolean };

const DEVICE_ID = "courtside-web-dev";

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

  const gameId = session?.gameId ?? "";
  const basketSide: BasketSide = session?.homeAttackSide ?? "LEFT";
  const onCourt = session?.onCourt ?? [];

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
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

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

  const persistShot = useCallback(
    async (shot: ShotChartClick, made: boolean, playerId: string) => {
      if (!store || !session) return;
      const flags = shotAttemptFlags({ made, fouledOnShot: false });
      const nextHlc = tickHlc(hlc);
      setHlc(nextHlc);
      const event: PlayByPlayEvent = {
        eventId: crypto.randomUUID(),
        gameId: session.gameId,
        period: session.period,
        teamId: session.homeTeamId,
        playerId,
        type: "SHOT",
        hlc: nextHlc,
        payload: {
          x: shot.x,
          y: shot.y,
          basketSide: shot.basketSide,
          isThree: shot.isThree,
          made,
          shotType: "JUMP_SHOT",
          countsAsFga: flags.countsAsFga,
          andOne: flags.andOne,
        },
      };
      await store.appendEvent(event);
      await refresh(store, session.gameId);
      setWizard({ step: "idle" });
    },
    [store, session, hlc, refresh],
  );

  const syncNow = useCallback(async () => {
    if (!store) return;
    const result = await pushOutbox(store);
    if (gameId) await refresh(store, gameId);
    setSyncMsg(
      result.ok
        ? `ซิงก์แล้ว +${result.inserted} (ข้าม ${result.skipped})`
        : `ซิงก์ไม่สำเร็จ: ${result.error}`,
    );
  }, [store, gameId, refresh]);

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
    const result = await exportGameExcel(events, gameId);
    if (result === "empty") {
      setSyncMsg(th.exportEmpty);
      return;
    }
    if (result === "saved") {
      setSyncMsg(th.exportSaved(`sp-game-${gameId.slice(0, 8)}.xlsx`));
    } else if (result === "cancelled") {
      setSyncMsg(th.exportCancelled);
    } else {
      setSyncMsg(th.exportFailed(result.error));
    }
  }, [events, gameId]);

  const statusLabel = useMemo(() => {
    if (!online) return th.syncOffline;
    if (pending > 0) return th.syncPending(pending);
    return th.syncOnline;
  }, [online, pending]);

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
      <header className="topbar">
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
            onClick={() => void syncNow()}
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

      <div className="game-banner">
        <div>
          <span className="muted">{th.currentGame}</span>
          <strong>{session.label}</strong>
        </div>
        <button
          type="button"
          className="btn tiny"
          onClick={() => void handleChangeGame()}
        >
          {th.changeGame}
        </button>
      </div>

      <main className="main">
        <section className="court-panel">
          <h1>{th.shotPrompt}</h1>
          <ShotChart
            basketSide={basketSide}
            onShot={(shot) => setWizard({ step: "outcome", shot })}
          />
          {syncMsg && <p className="muted">{syncMsg}</p>}
        </section>

        <aside className="side">
          {wizard.step === "outcome" && (
            <div className="card">
              <p>
                {wizard.shot.isThree ? "3PT" : "2PT"} @ (
                {wizard.shot.x.toFixed(2)}, {wizard.shot.y.toFixed(2)})
              </p>
              <div className="row">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setWizard({
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
                  className="btn"
                  onClick={() =>
                    setWizard({
                      step: "player",
                      shot: wizard.shot,
                      made: false,
                    })
                  }
                >
                  {th.missed}
                </button>
              </div>
            </div>
          )}

          {wizard.step === "player" && (
            <div className="card">
              <h2>{th.selectPlayer}</h2>
              <ul className="players">
                {onCourt.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="btn block"
                      onClick={() =>
                        void persistShot(wizard.shot, wizard.made, p.id)
                      }
                    >
                      {p.name} · ฟาล์ว {p.fouls}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>อีเวนต์ล่าสุด ({events.length})</h2>
            <ol className="log">
              {[...events]
                .reverse()
                .slice(0, 8)
                .map((e) => (
                  <li key={e.eventId}>
                    {e.type} · {String((e.payload as { made?: boolean }).made)}
                  </li>
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
    </div>
  );
}
