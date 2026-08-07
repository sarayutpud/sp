import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { COURTSIDE_DOWNLOAD_URL } from "../lib/constants";

const NAV = [
  { to: "/", label: "เริ่มต้น / คู่มือ", mark: "ค", end: true },
  { to: "/competitions", label: "การแข่งขัน", mark: "ล" },
  { to: "/teams", label: "ทีม", mark: "ท" },
  { to: "/players", label: "ผู้เล่น", mark: "ผ" },
  { to: "/import", label: "นำเข้า Excel", mark: "น" },
  { to: "/games", label: "แมตช์", mark: "ม" },
  { to: "/reports", label: "รายงาน", mark: "ร" },
  { to: "/rosters", label: "บัญชีฤดูกาล", mark: "ฤ", optional: true },
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
              <span>สองทีม · FIBA Box Score</span>
            </div>
          </div>
        </div>
        <div className="app-user">
          <a
            className="btn tiny primary download-app-btn"
            href={COURTSIDE_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            title="Setup · MSI · exe ในโฟลเดอร์ Drive"
          >
            <span className="download-app-label-full">ดาวน์โหลดแอป</span>
            <span className="download-app-label-short">แอป</span>
          </a>
          <span className="app-user-email">{session?.user.email}</span>
          <button
            type="button"
            className="btn tiny ghost signout-btn"
            onClick={() => void signOut()}
          >
            <span className="signout-full">ออกจากระบบ</span>
            <span className="signout-short">ออก</span>
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
        </nav>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
