import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/players", label: "จัดการผู้เล่น" },
  { to: "/rosters", label: "จัดสรรรายชื่อ" },
  { to: "/reports", label: "รายงานสรุป" },
] as const;

export function AppLayout() {
  const { session, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-top">
        <div className="app-brand">
          <img className="app-logo" src="/sp-logo.png" alt="SP FITNESS" />
          <div>
            <strong>SP CMS</strong>
            <span>จัดการผู้เล่น · รายงานสถิติ</span>
          </div>
        </div>
        <div className="app-user">
          <span className="muted">{session?.user.email}</span>
          <button type="button" className="btn tiny" onClick={() => void signOut()}>
            ออกจากระบบ
          </button>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
          <a
            className="nav-link manual"
            href="/user-manual.html"
            target="_blank"
            rel="noreferrer"
          >
            คู่มือ
          </a>
        </nav>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
