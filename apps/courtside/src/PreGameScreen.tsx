import { useCallback, useEffect, useMemo, useState } from "react";
import { th } from "./i18n/th";
import {
  DEFAULT_COMPETITION_ID,
  createGameOnline,
  fetchGameRosterPlayers,
  fetchGames,
  fetchTeamsOnline,
} from "./lib/game-loader";
import {
  type ActiveGameSession,
  type GameListItem,
  type OurSide,
  cacheGames,
  saveSession,
} from "./lib/game-session";
import type { LocalStore } from "./lib/local-store";

type Props = {
  store: LocalStore;
  online: boolean;
  onStart: (session: ActiveGameSession) => void;
};

export function PreGameScreen({ store, online, onStart }: Props) {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [playersBySide, setPlayersBySide] = useState<
    Record<
      OurSide,
      Array<{
        id: string;
        name: string;
        jerseyNumber: string;
        isStarter?: boolean;
      }>
    >
  >({ HOME: [], AWAY: [] });
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<OurSide, Set<string>>
  >(() => ({ HOME: new Set(), AWAY: new Set() }));
  const [busy, setBusy] = useState(false);
  const [playersFromCache, setPlayersFromCache] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [teams, setTeams] = useState<
    Array<{ id: string; name: string; short_name: string | null }>
  >([]);
  const [ourTeamId, setOurTeamId] = useState("");
  const [opponentTeamId, setOpponentTeamId] = useState("");
  const [ourSide, setOurSide] = useState<OurSide>("HOME");
  const [creating, setCreating] = useState(false);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedId) ?? null,
    [games, selectedId],
  );

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchGames(store, online);
      setGames(result.games);
      setFromCache(result.fromCache);
      setSelectedId((prev) => prev || result.games[0]?.id || "");
      if (online) {
        const teamRows = await fetchTeamsOnline();
        setTeams(teamRows);
        setOurTeamId((prev) => prev || teamRows[0]?.id || "");
        setOpponentTeamId((prev) => prev || teamRows[1]?.id || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการเกมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [store, online]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (!selectedGame) {
      setPlayersBySide({ HOME: [], AWAY: [] });
      setSelectedPlayers({ HOME: new Set(), AWAY: new Set() });
      return;
    }
    let cancelled = false;
    setBusy(true);
    Promise.all([
      fetchGameRosterPlayers(
        store,
        selectedGame.id,
        selectedGame.homeTeamId,
        online,
      ),
      fetchGameRosterPlayers(
        store,
        selectedGame.id,
        selectedGame.awayTeamId,
        online,
      ),
    ])
      .then(([home, away]) => {
        if (cancelled) return;
        setPlayersBySide({ HOME: home.players, AWAY: away.players });
        setPlayersFromCache(home.fromCache || away.fromCache);
        const initial = (players: typeof home.players) => {
          const starters = players.filter((p) => p.isStarter).map((p) => p.id);
          return new Set(
            starters.length === 5
              ? starters
              : players.slice(0, 5).map((p) => p.id),
          );
        };
        setSelectedPlayers({
          HOME: initial(home.players),
          AWAY: initial(away.players),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "โหลดรายชื่อผู้เล่นไม่สำเร็จ");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGame, store, online]);

  const togglePlayer = (side: OurSide, id: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev[side]);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return { ...prev, [side]: next };
    });
  };

  const createMatch = async () => {
    if (!online) {
      setError(th.createMatchNeedOnline);
      return;
    }
    if (!opponentTeamId || opponentTeamId === ourTeamId) {
      setError("เลือกคู่แข่งที่เป็นคนละทีม");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const created = await createGameOnline({
        competitionId: DEFAULT_COMPETITION_ID,
        ourTeamId,
        opponentTeamId,
        ourSide,
      });
      const nextGames = [created, ...games.filter((g) => g.id !== created.id)];
      setGames(nextGames);
      await cacheGames(store, nextGames);
      setSelectedId(created.id);
      setShowCreate(false);
      setOpponentTeamId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : th.createMatchFailed);
    } finally {
      setCreating(false);
    }
  };

  const start = async () => {
    if (
      !selectedGame ||
      selectedPlayers.HOME.size !== 5 ||
      selectedPlayers.AWAY.size !== 5
    )
      return;
    const toRow = (p: {
      id: string;
      name: string;
      jerseyNumber: string;
    }) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      fouls: 0,
    });
    const toTeam = (side: OurSide) => ({
      onCourt: playersBySide[side]
        .filter((p) => selectedPlayers[side].has(p.id))
        .map(toRow),
      bench: playersBySide[side]
        .filter((p) => !selectedPlayers[side].has(p.id))
        .map(toRow),
      foulsPeriod: 0,
    });
    const homeTeam = toTeam("HOME");
    const awayTeam = toTeam("AWAY");
    const session: ActiveGameSession = {
      gameId: selectedGame.id,
      ourTeamId: selectedGame.ourTeamId,
      opponentName: selectedGame.opponentName,
      ourSide: selectedGame.ourSide,
      homeTeamId: selectedGame.homeTeamId,
      awayTeamId: selectedGame.awayTeamId,
      homeTeamName: selectedGame.homeTeamName,
      awayTeamName: selectedGame.awayTeamName,
      homeTeamCode: selectedGame.homeTeamCode,
      awayTeamCode: selectedGame.awayTeamCode,
      competitionId: selectedGame.competitionId ?? DEFAULT_COMPETITION_ID,
      scheduledAt: selectedGame.scheduledAt,
      label: `${selectedGame.homeTeamName} vs ${selectedGame.awayTeamName}`,
      teams: { HOME: homeTeam, AWAY: awayTeam },
      tipStarters: {
        HOME: homeTeam.onCourt.map((p) => p.id),
        AWAY: awayTeam.onCourt.map((p) => p.id),
      },
      activeSide: selectedGame.ourSide,
      period: 1,
      homeAttackSide: "LEFT",
      periodStartHome: 0,
      periodStartAway: 0,
      completedPeriodScores: [],
    };
    await saveSession(store, session);
    onStart(session);
  };

  return (
    <div className="pregame">
      <div className="pregame-card">
        <h1>{th.preGame}</h1>
        <p className="muted">{th.preGameHint}</p>

        {loading && <p>{th.loadingGames}</p>}
        {error && <p className="err">{error}</p>}
        {!loading && games.length === 0 && <p>{th.noGames}</p>}

        {!online && <p className="muted">{th.offlineGameList}</p>}
        {fromCache && online && <p className="muted">{th.gamesFromCache}</p>}

        <div className="field">
          <label htmlFor="game-select">{th.selectGame}</label>
          <select
            id="game-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={games.length === 0}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => void loadGames()}
            disabled={loading}
          >
            {th.refreshGames}
          </button>
          {online && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? th.cancelCreateMatch : th.createMatch}
            </button>
          )}
        </div>

        {showCreate && (
          <div className="pregame-create">
            <h2>{th.createMatch}</h2>
            <p className="muted">{th.createMatchHint}</p>
            <label>
              {th.ourTeam}
              <select
                value={ourTeamId}
                onChange={(e) => setOurTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {th.opponentTeam}
              <select
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
              >
                <option value="">{th.selectOpponent}</option>
                {teams
                  .filter((t) => t.id !== ourTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="side-fieldset">
              <legend>{th.ourSide}</legend>
              <div className="segment" role="group" aria-label={th.ourSide}>
                <button
                  type="button"
                  className={ourSide === "HOME" ? "active" : ""}
                  onClick={() => setOurSide("HOME")}
                >
                  {th.sideHome}
                </button>
                <button
                  type="button"
                  className={ourSide === "AWAY" ? "active" : ""}
                  onClick={() => setOurSide("AWAY")}
                >
                  {th.sideAway}
                </button>
              </div>
            </fieldset>
            <button
              type="button"
              className="btn primary"
              disabled={
                creating ||
                !ourTeamId ||
                !opponentTeamId ||
                ourTeamId === opponentTeamId
              }
              onClick={() => void createMatch()}
            >
              {creating ? th.creatingMatch : th.createMatchSubmit}
            </button>
          </div>
        )}

        {selectedGame && (
          <div className="pregame-roster">
            <h2>{th.selectBothOnCourt}</h2>
            <p className="muted">
              {th.onCourtCount(selectedPlayers.HOME.size)} /{" "}
              {th.onCourtCount(selectedPlayers.AWAY.size)}
              {playersFromCache ? ` · ${th.playersFromCache}` : ""}
            </p>
            {busy && <p className="muted">กำลังโหลดรายชื่อ…</p>}
            {(["HOME", "AWAY"] as const).map((side) => (
              <div key={side}>
                <h3>
                  {side === "HOME"
                    ? selectedGame.homeTeamName
                    : selectedGame.awayTeamName}
                </h3>
                {playersBySide[side].length === 0 && !busy && (
                  <p>{th.noPlayers}</p>
                )}
                <ul className="pregame-players">
                  {playersBySide[side].map((p) => {
                    const checked = selectedPlayers[side].has(p.id);
                    const disabled =
                      !checked && selectedPlayers[side].size >= 5;
                    return (
                      <li key={p.id}>
                        <label className={disabled ? "disabled" : ""}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePlayer(side, p.id)}
                          />
                          {p.jerseyNumber} {p.name}
                          {p.isStarter ? " · ตัวจริง" : ""}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <button
              type="button"
              className="btn primary block"
              disabled={
                selectedPlayers.HOME.size !== 5 ||
                selectedPlayers.AWAY.size !== 5
              }
              onClick={() => void start()}
            >
              {th.startGame}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
