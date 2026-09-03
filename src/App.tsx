import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { NotFound } from './pages/NotFound';
import { Profile } from './pages/Profile';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Seasons } from './pages/Seasons';
import { Compare } from './pages/Compare';
import { GuideLibrary } from './pages/GuideLibrary';
import { GuideDetail } from './pages/GuideDetail';
import { CostsOverview } from './pages/CostsOverview';
import { Lab } from './pages/Lab';
import { CategoryDetail } from './pages/CategoryDetail';
import { FarmCategoryDetail } from './pages/FarmCategoryDetail';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

        {/* Public static routes */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

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
          path="/profile"
          element={
            <ProtectedRoute>
              <AppShell>
                <Profile />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/seasons"
          element={
            <ProtectedRoute>
              <AppShell>
                <Seasons />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <AppShell>
                <Compare />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costs"
          element={
            <ProtectedRoute>
              <AppShell>
                <CostsOverview />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab"
          element={
            <ProtectedRoute>
              <AppShell>
                <Lab />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/guides"
          element={
            <ProtectedRoute>
              <AppShell>
                <GuideLibrary />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/guides/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <GuideDetail />
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
          path="/season/:id/category/:category"
          element={
            <ProtectedRoute>
              <AppShell>
                <CategoryDetail />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costs/category/:category"
          element={
            <ProtectedRoute>
              <AppShell>
                <FarmCategoryDetail />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}


