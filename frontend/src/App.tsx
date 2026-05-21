import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { APP_ROUTES } from '@/lib/constants/routes';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ThemeContextProvider } from '@/context/theme-context';
import { AdminPage, AuthPage, DashboardPage, DelegatePage } from '@/pages';
import { PublicOnlyRoute } from '@/routes/guards/PublicOnlyGuard';
import { ProtectedAdminRoute } from '@/routes/guards/ProtectedAdminGuard';
import { ProtectedDelegueRoute } from '@/routes/guards/ProtectedDelegueGuard';
import { ProtectedDashboardRoute } from '@/routes/guards/ProtectedDashboardGuard';

function AppContent() {
  const { theme, resolvedTheme, toggleTheme } = useThemeMode();
  const location = useLocation();
  const isLoginRoute = location.pathname === APP_ROUTES.root;

  return (
    <ThemeContextProvider value={{ theme, resolvedTheme, toggleTheme }}>
      {isLoginRoute ? (
        <ThemeToggle theme={theme} resolvedTheme={resolvedTheme} onToggle={toggleTheme} />
      ) : null}
      <Routes>
        <Route
          path={APP_ROUTES.root}
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path={APP_ROUTES.dashboard}
          element={
            <ProtectedDashboardRoute>
              <DashboardPage />
            </ProtectedDashboardRoute>
          }
        />
        <Route
          path={APP_ROUTES.admin}
          element={
            <ProtectedAdminRoute>
              <AdminPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path={APP_ROUTES.delegue}
          element={
            <ProtectedDelegueRoute>
              <DelegatePage />
            </ProtectedDelegueRoute>
          }
        />
        <Route path="*" element={<Navigate to={APP_ROUTES.root} replace />} />
      </Routes>
    </ThemeContextProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
