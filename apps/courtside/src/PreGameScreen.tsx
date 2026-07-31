import { useCallback, useEffect, useMemo, useState } from "react";
import { th } from "./i18n/th";
import {
  DEFAULT_COMPETITION_ID,
  createGameOnline,
  fetchGames,
  fetchTeamPlayers,
  fetchTeamsOnline,
} from "./lib/game-loader";
import {
  type ActiveGameSession,
  type GameListItem,
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
  const [players, setPlayers] = useState<
    Array<{ id: string; name: string; jerseyNumber: string }>
  >([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    () => new Set(),
  );
  const [busy, setBusy] = useState(false);
  const [playersFromCache, setPlayersFromCache] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [teams, setTeams] = useState<
    Array<{ id: string; name: string; short_name: string | null }>
  >([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
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
        setHomeTeamId((prev) => prev || teamRows[0]?.id || "");
        setAwayTeamId((prev) => {
          if (prev) return prev;
          const away = teamRows.find((t) => t.id !== teamRows[0]?.id);
          return away?.id || "";
        });
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
        setSelectedPlayers(
          new Set(result.players.slice(0, 5).map((p) => p.id)),
        );
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

  const createMatch = async () => {
    if (!online) {
      setError(th.createMatchNeedOnline);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const created = await createGameOnline({
        competitionId: DEFAULT_COMPETITION_ID,
        homeTeamId,
        awayTeamId,
      });
      const nextGames = [created, ...games.filter((g) => g.id !== created.id)];
      setGames(nextGames);
      await cacheGames(store, nextGames);
      setSelectedId(created.id);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : th.createMatchFailed);
    } finally {
      setCreating(false);
    }
  };

  const start = async () => {
    if (!selectedGame || selectedPlayers.size !== 5) return;
    const toRow = (p: { id: string; name: string; jerseyNumber: string }) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      fouls: 0,
    });
    const onCourt = players.filter((p) => selectedPlayers.has(p.id)).map(toRow);
    const bench = players.filter((p) => !selectedPlayers.has(p.id)).map(toRow);
    const session: ActiveGameSession = {
      gameId: selectedGame.id,
      homeTeamId: selectedGame.homeTeamId,
      awayTeamId: selectedGame.awayTeamId,
      ourTeamId: selectedGame.homeTeamId,
      competitionId: DEFAULT_COMPETITION_ID,
      label: `${selectedGame.homeName} vs ${selectedGame.awayName}`,
      onCourt,
      bench,
      period: 1,
      homeAttackSide: "LEFT",
      ourTeamFoulsPeriod: 0,
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

        {online && (
          <div className="row" style={{ marginBottom: "0.75rem" }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? th.cancelCreateMatch : th.createMatch}
            </button>
          </div>
        )}

        {showCreate && online && (
          <div className="pregame-create">
            <h2>{th.createMatch}</h2>
            <p className="muted">{th.createMatchHint}</p>
            <label className="field">
              <span>{th.homeTeam}</span>
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{th.awayTeam}</span>
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn primary"
              disabled={creating || !homeTeamId || !awayTeamId}
              onClick={() => void createMatch()}
            >
              {creating ? th.creatingMatch : th.createMatchSubmit}
            </button>
          </div>
        )}

        {(games.length > 0 || !loading) && (
          <>
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
                {fromCache && <p className="muted">{th.gamesFromCache}</p>}
                {!online && <p className="muted">{th.offlineGameList}</p>}
              </>
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
                {players.length > 5 && (
                  <p className="muted">
                    {th.benchCount(players.length - selectedPlayers.size)} ·{" "}
                    {th.ourTeamOnly}
                  </p>
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
