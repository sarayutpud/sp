import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

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
    queryKey: ["supabase-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rulesets")
        .select("id,name")
        .limit(1);
      if (error) throw error;
      return { ok: true, service: "supabase", sample: data?.[0]?.name ?? null };
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
    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setAuthMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง — ใช้ sp@test.com / sptest");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setAuthMsg("อีเมลยังไม่ยืนยัน — ติดต่อผู้ดูแลระบบ");
      } else {
        setAuthMsg(error.message);
      }
    }
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
        {health.isLoading && <p>กำลังเชื่อมต่อ Supabase…</p>}
        {health.isError && (
          <p className="err">
            เชื่อม Supabase ไม่ได้ — ตรวจ VITE_SUPABASE_URL / key บน Vercel
          </p>
        )}
        {health.data && (
          <p className="ok">Supabase พร้อม · {health.data.service}</p>
        )}
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
                placeholder="sp@test.com"
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
