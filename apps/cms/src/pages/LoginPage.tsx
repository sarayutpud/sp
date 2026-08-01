import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState(
    import.meta.env.DEV ? "sp@test.com" : "",
  );
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setAuthMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setAuthMsg(error.message);
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img className="login-logo" src="/sp-logo.png" alt="SP FITNESS" />
        <p className="login-brand">SP FITNESS BANG SUE</p>
        <h1>เข้าสู่ระบบ CMS</h1>
        <p className="muted login-sub">
          จัดการผู้เล่นสองทีม · แมตช์ · ใบสถิติ FIBA
        </p>

        <form className="auth" onSubmit={(e) => void onLogin(e)}>
          <label>
            อีเมล
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
            />
          </label>
          {authMsg ? (
            <p className="err" role="alert" aria-live="polite">
              {authMsg}
            </p>
          ) : null}
          <button type="submit" className="btn primary block" disabled={busy}>
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
