import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider, useAuth } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { PlayersPage } from "./pages/PlayersPage";
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
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/players" replace />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="rosters" element={<RostersPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/players" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
