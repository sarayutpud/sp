import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "เริ่มต้น", mark: "1", end: true },
  { to: "/players", label: "ผู้เล่น", mark: "P" },
  { to: "/games", label: "แมตช์", mark: "M" },
  { to: "/reports", label: "รายงาน", mark: "Σ" },
  { to: "/rosters", label: "บัญชีฤดูกาล", mark: "R", optional: true },
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
              <span>ใบสถิติสองทีม · โค้ช</span>
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
              end={"end" in item ? item.end : undefined}
              onClick={closeMenu}
              className={({ isActive }) =>
                [
                  "nav-link",
                  isActive ? "active" : "",
                  "optional" in item && item.optional ? "optional" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <span className="nav-mark" aria-hidden="true">
                {item.mark}
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
            <span className="nav-mark" aria-hidden="true">
              ?
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
