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
  const [players, setPlayers] = useState<
    Array<{ id: string; name: string; jerseyNumber: string; isStarter?: boolean }>
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
  const [ourTeamId, setOurTeamId] = useState("");
  const [opponentName, setOpponentName] = useState("");
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
    fetchGameRosterPlayers(
      store,
      selectedGame.id,
      selectedGame.ourTeamId,
      online,
    )
      .then((result) => {
        if (cancelled) return;
        setPlayers(result.players);
        setPlayersFromCache(result.fromCache);
        const starters = result.players.filter((p) => p.isStarter).map((p) => p.id);
        const initial =
          starters.length === 5
            ? starters
            : result.players.slice(0, 5).map((p) => p.id);
        setSelectedPlayers(new Set(initial));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "โหลดรายชื่อผู้เล่นไม่สำเร็จ",
          );
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
    if (!opponentName.trim()) {
      setError("ใส่ชื่อคู่แข่ง");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const created = await createGameOnline({
        competitionId: DEFAULT_COMPETITION_ID,
        ourTeamId,
        opponentName,
        ourSide,
      });
      const nextGames = [created, ...games.filter((g) => g.id !== created.id)];
      setGames(nextGames);
      await cacheGames(store, nextGames);
      setSelectedId(created.id);
      setShowCreate(false);
      setOpponentName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : th.createMatchFailed);
    } finally {
      setCreating(false);
    }
  };

  const start = async () => {
    if (!selectedGame || selectedPlayers.size !== 5) return;
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
    const onCourt = players.filter((p) => selectedPlayers.has(p.id)).map(toRow);
    const bench = players.filter((p) => !selectedPlayers.has(p.id)).map(toRow);
    const session: ActiveGameSession = {
      gameId: selectedGame.id,
      ourTeamId: selectedGame.ourTeamId,
      opponentName: selectedGame.opponentName,
      ourSide: selectedGame.ourSide,
      competitionId: selectedGame.competitionId ?? DEFAULT_COMPETITION_ID,
      label: `${selectedGame.ourTeamName} vs ${selectedGame.opponentName}`,
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
              {th.opponentName}
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="เช่น โรงเรียน ก"
              />
            </label>
            <fieldset className="side-fieldset">
              <legend>{th.ourSide}</legend>
              <label className="inline">
                <input
                  type="radio"
                  name="ourSide"
                  checked={ourSide === "HOME"}
                  onChange={() => setOurSide("HOME")}
                />
                {th.sideHome}
              </label>
              <label className="inline">
                <input
                  type="radio"
                  name="ourSide"
                  checked={ourSide === "AWAY"}
                  onChange={() => setOurSide("AWAY")}
                />
                {th.sideAway}
              </label>
            </fieldset>
            <button
              type="button"
              className="btn primary"
              disabled={creating || !ourTeamId || !opponentName.trim()}
              onClick={() => void createMatch()}
            >
              {creating ? th.creatingMatch : th.createMatchSubmit}
            </button>
          </div>
        )}

        {selectedGame && (
          <div className="pregame-roster">
            <h2>
              {th.selectOnCourt(selectedGame.ourTeamName)} ·{" "}
              {selectedGame.ourSide === "HOME" ? th.sideHome : th.sideAway}
            </h2>
            <p className="muted">
              {th.onCourtCount(selectedPlayers.size)}
              {playersFromCache ? ` · ${th.playersFromCache}` : ""}
            </p>
            {busy && <p className="muted">กำลังโหลดรายชื่อ…</p>}
            {players.length === 0 && !busy && <p>{th.noPlayers}</p>}
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
                      {p.isStarter ? " · ตัวจริง" : ""}
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="btn primary block"
              disabled={selectedPlayers.size !== 5}
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
