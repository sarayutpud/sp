import { shotAttemptFlags } from "@sp/rules-engine";
import type { BasketSide, PlayByPlayEvent } from "@sp/shared-types";
import { createHlc, tickHlc } from "@sp/sync-protocol";
import { ShotChart, type ShotChartClick } from "@sp/ui";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { th } from "./i18n/th";
import { exportGameExcel } from "./lib/excel";

type Wizard =
  | { step: "idle" }
  | { step: "outcome"; shot: ShotChartClick }
  | { step: "player"; shot: ShotChartClick; made: boolean };

const DEMO_ON_COURT = [
  { id: "11111111-1111-4111-8111-111111111101", name: "11 วิชัย", fouls: 1 },
  { id: "11111111-1111-4111-8111-111111111102", name: "7 อาทิตย์", fouls: 0 },
  { id: "11111111-1111-4111-8111-111111111103", name: "23 กิตติ", fouls: 2 },
  { id: "11111111-1111-4111-8111-111111111104", name: "5 ณัฐ", fouls: 0 },
  { id: "11111111-1111-4111-8111-111111111105", name: "9 สมชาย", fouls: 4 },
];

const GAME_ID = "22222222-2222-4222-8222-222222222201";

export function App() {
  const [online] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [events, setEvents] = useState<PlayByPlayEvent[]>([]);
  const [hlc, setHlc] = useState(() => createHlc("courtside-local"));
  const [wizard, setWizard] = useState<Wizard>({ step: "idle" });
  const [basketSide] = useState<BasketSide>("LEFT");
  const [lastSynced] = useState<string>("—");

  const undo = useCallback(() => {
    setEvents((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setPending((p) => Math.max(0, p - 1));
      return next;
    });
    setWizard({ step: "idle" });
  }, []);

  useHotkeys("ctrl+z", (e) => {
    e.preventDefault();
    undo();
  });

  const persistShot = useCallback(
    (shot: ShotChartClick, made: boolean, playerId: string) => {
      const flags = shotAttemptFlags({ made, fouledOnShot: false });
      const nextHlc = tickHlc(hlc);
      setHlc(nextHlc);
      const event: PlayByPlayEvent = {
        eventId: crypto.randomUUID(),
        gameId: GAME_ID,
        period: 1,
        teamId: "33333333-3333-4333-8333-333333333301",
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
      setEvents((prev) => [...prev, event]);
      setPending((p) => p + 1);
      setWizard({ step: "idle" });
    },
    [hlc],
  );

  const statusLabel = useMemo(() => {
    if (!online) return th.syncOffline;
    if (pending > 0) return th.syncPending(pending);
    return th.syncOnline;
  }, [online, pending]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <strong className="brand">{th.appTitle}</strong>
          <span className="muted"> · บันทึกสถิติข้างสนาม</span>
        </div>
        <div className="sync" data-state={online ? "on" : "off"}>
          <span className="dot" />
          {statusLabel}
          <span className="muted"> · {th.lastSynced}: {lastSynced}</span>
        </div>
      </header>

      <main className="main">
        <section className="court-panel">
          <h1>{th.shotPrompt}</h1>
          <ShotChart
            basketSide={basketSide}
            onShot={(shot) => setWizard({ step: "outcome", shot })}
          />
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
                {DEMO_ON_COURT.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="btn block"
                      onClick={() =>
                        persistShot(wizard.shot, wizard.made, p.id)
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
              {[...events].reverse().slice(0, 8).map((e) => (
                <li key={e.eventId}>
                  {e.type} · {String((e.payload as { made?: boolean }).made)}
                </li>
              ))}
            </ol>
            <div className="row">
              <button type="button" className="btn" onClick={undo}>
                {th.undo}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportGameExcel(events).catch((err) =>
                    console.error(err),
                  )
                }
              >
                {th.exportExcel}
              </button>
            </div>
            <button type="button" className="btn block" disabled>
              {th.backup} (Tauri)
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
