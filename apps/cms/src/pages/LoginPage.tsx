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

  if (!loading && session) return <Navigate to="/players" replace />;

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
        <h1>CMS</h1>
        <p className="muted login-sub">เข้าสู่ระบบเพื่อจัดการผู้เล่นและดูรายงาน</p>

        <form className="auth" onSubmit={(e) => void onLogin(e)}>
          <label>
            อีเมล
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn primary block" disabled={busy}>
            เข้าสู่ระบบ
          </button>
          {authMsg && <p className="err">{authMsg}</p>}
        </form>
      </div>
    </div>
  );
}
