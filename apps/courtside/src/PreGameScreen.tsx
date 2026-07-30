import { useCallback, useEffect, useMemo, useState } from "react";
import { th } from "./i18n/th";
import { fetchGames, fetchTeamPlayers } from "./lib/game-loader";
import {
  type ActiveGameSession,
  type GameListItem,
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
  const [players, setPlayers] = useState<
    Array<{ id: string; name: string; jerseyNumber: string }>
  >([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    () => new Set(),
  );
  const [busy, setBusy] = useState(false);
  const [playersFromCache, setPlayersFromCache] = useState(false);

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
      if (!selectedId && result.games[0]) {
        setSelectedId(result.games[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการเกมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [store, online, selectedId]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (!selectedGame) {
      setPlayers([]);
      setSelectedPlayers(new Set());
      return;
    }
    let cancelled = false;
    setBusy(true);
    fetchTeamPlayers(store, selectedGame.homeTeamId, online)
      .then((result) => {
        if (cancelled) return;
        setPlayers(result.players);
        setPlayersFromCache(result.fromCache);
        setSelectedPlayers(new Set(result.players.slice(0, 5).map((p) => p.id)));
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

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const start = async () => {
    if (!selectedGame || selectedPlayers.size !== 5) return;
    const onCourt = players
      .filter((p) => selectedPlayers.has(p.id))
      .map((p) => ({
        id: p.id,
        name: `${p.jerseyNumber} ${p.name}`,
        fouls: 0,
      }));
    const session: ActiveGameSession = {
      gameId: selectedGame.id,
      homeTeamId: selectedGame.homeTeamId,
      awayTeamId: selectedGame.awayTeamId,
      label: `${selectedGame.homeName} vs ${selectedGame.awayName}`,
      onCourt,
      period: 1,
      homeAttackSide: "LEFT",
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

        {games.length > 0 && (
          <>
            <label className="field">
              <span>{th.selectGame}</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} ({g.status})
                  </option>
                ))}
              </select>
            </label>
            {fromCache && (
              <p className="muted">{th.gamesFromCache}</p>
            )}
            {!online && (
              <p className="muted">{th.offlineGameList}</p>
            )}

            {selectedGame && (
              <div className="pregame-roster">
                <h2>{th.selectOnCourt(selectedGame.homeName)}</h2>
                <p className="muted">
                  {th.onCourtCount(selectedPlayers.size)}
                  {playersFromCache && ` · ${th.playersFromCache}`}
                </p>
                <ul className="pregame-players">
                  {players.map((p) => {
                    const checked = selectedPlayers.has(p.id);
                    const disabled = !checked && selectedPlayers.size >= 5;
                    return (
                      <li key={p.id}>
                        <label className={disabled ? "disabled" : ""}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePlayer(p.id)}
                          />
                          {p.jerseyNumber} {p.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {players.length === 0 && !busy && (
                  <p className="muted">{th.noPlayers}</p>
                )}
              </div>
            )}

            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => void loadGames()}
              >
                {th.refreshGames}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!selectedGame || selectedPlayers.size !== 5 || busy}
                onClick={() => void start()}
              >
                {th.startGame}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
