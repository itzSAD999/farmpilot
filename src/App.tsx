import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PublicRoute } from './components/layout/PublicRoute';
import { AppShell } from './components/layout/AppShell';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { FarmSetup } from './pages/FarmSetup';
import { Dashboard } from './pages/Dashboard';
import { SeasonNew } from './pages/SeasonNew';
import { SeasonDetail } from './pages/SeasonDetail';
import { EstimateReport } from './pages/EstimateReport';
import { Landing } from './pages/Landing';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farm/setup"
          element={
            <ProtectedRoute>
              <AppShell>
                <FarmSetup />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/season/new"
          element={
            <ProtectedRoute>
              <AppShell>
                <SeasonNew />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/season/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <SeasonDetail />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:estimateId"
          element={
            <ProtectedRoute>
              <AppShell>
                <EstimateReport />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


