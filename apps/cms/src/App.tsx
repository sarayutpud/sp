import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider, useAuth } from "./lib/auth";
import { GamesPage } from "./pages/GamesPage";
import { GuidePage } from "./pages/GuidePage";
import { LoginPage } from "./pages/LoginPage";
import { PlayersPage } from "./pages/PlayersPage";
import { PublicReportPage } from "./pages/PublicReportPage";
import { ReportsPage } from "./pages/ReportsPage";
import { RostersPage } from "./pages/RostersPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-page">
        <p className="muted">กำลังโหลด…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/share/:gameId" element={<PublicReportPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<GuidePage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="rosters" element={<RostersPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="season"
              element={<Navigate to="/reports?scope=season" replace />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
