import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/players", label: "จัดการผู้เล่น", icon: "🏀" },
  { to: "/rosters", label: "จัดสรรรายชื่อ", icon: "📋" },
  { to: "/games", label: "จัดการแมตช์", icon: "🗓️" },
  { to: "/reports", label: "รายงานสรุป", icon: "📊" },
] as const;

export function AppLayout() {
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <header className="app-top">
        <div className="app-top-left">
          <button
            type="button"
            className="nav-toggle"
            aria-label="เมนู"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={menuOpen ? "burger open" : "burger"} />
          </button>
          <div className="app-brand">
            <img className="app-logo" src="/sp-logo.png" alt="SP FITNESS" />
            <div className="app-brand-text">
              <strong>SP CMS</strong>
              <span>จัดการผู้เล่น · รายงานสถิติ</span>
            </div>
          </div>
        </div>
        <div className="app-user">
          <span className="app-user-email">{session?.user.email}</span>
          <button
            type="button"
            className="btn tiny ghost"
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <div className="app-body">
        {menuOpen && (
          <button
            type="button"
            className="nav-overlay"
            aria-label="ปิดเมนู"
            onClick={closeMenu}
          />
        )}
        <nav className={menuOpen ? "app-nav open" : "app-nav"}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <a
            className="nav-link manual"
            href="/user-manual.html"
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            <span className="nav-icon" aria-hidden="true">
              📖
            </span>
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
