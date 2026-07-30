import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${API}/health`);
      if (!res.ok) throw new Error("API offline");
      return res.json() as Promise<{ ok: boolean; service: string }>;
    },
    refetchInterval: 10_000,
  });

  const games = useQuery({
    queryKey: ["games", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,status,home_team_id,away_team_id,scheduled_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setAuthMsg(error.message);
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setAuthMsg(error.message);
    else setAuthMsg("สมัครแล้ว — ตรวจอีเมลยืนยันถ้าโปรเจกต์เปิด confirm ไว้");
  }

  async function onLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="page">
      <header className="hero">
        <img
          className="hero-logo"
          src="/sp-logo.png"
          alt="SP FITNESS BANG SUE"
        />
        <div className="brand-block">
          <p className="brand">SP</p>
          <p className="brand-sub">FITNESS BANG SUE</p>
          <h1>ระบบจัดการแข่งขันบาสเก็ตบอล</h1>
          <p className="lead">
            CMS สำหรับรายการแข่ง ทีม ตาราง และรายงานสถิติมาตรฐาน FIBA
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>สถานะระบบ</h2>
        {health.isLoading && <p>กำลังเชื่อมต่อ API…</p>}
        {health.isError && (
          <p className="err">ยังเชื่อม API ไม่ได้ — รัน `@sp/api` ที่พอร์ต 3001</p>
        )}
        {health.data && <p className="ok">API พร้อม · {health.data.service}</p>}
        <p className="muted">
          Supabase: {import.meta.env.VITE_SUPABASE_URL ? "configured" : "missing"}
        </p>
        <a className="manual-link" href="/user-manual.html" target="_blank" rel="noreferrer">
          เปิดคู่มือผู้ใช้งาน
        </a>
      </section>

      <section className="panel">
        <h2>เข้าสู่ระบบ</h2>
        {session ? (
          <div>
            <p className="ok">ล็อกอินแล้ว: {session.user.email}</p>
            <button type="button" className="btn" onClick={() => void onLogout()}>
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <form className="auth" onSubmit={(e) => void onLogin(e)}>
            <label>
              อีเมล
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <div className="row">
              <button type="submit" className="btn primary" disabled={busy}>
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={(e) => void onSignUp(e)}
              >
                สมัคร
              </button>
            </div>
            {authMsg && <p className="err">{authMsg}</p>}
          </form>
        )}
      </section>

      {session && (
        <section className="panel">
          <h2>เกมในระบบ</h2>
          {games.isLoading && <p>โหลด…</p>}
          {games.isError && <p className="err">{(games.error as Error).message}</p>}
          {games.data && games.data.length === 0 && <p>ยังไม่มีเกม</p>}
          {games.data && games.data.length > 0 && (
            <ul>
              {games.data.map((g) => (
                <li key={g.id}>
                  <code>{g.id.slice(0, 8)}</code> · {g.status}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
