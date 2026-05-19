import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '@/features/auth/AuthPage';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
import { AdminPage } from '@/features/dashboard/AdminPage';
import { DelegatePage } from '@/features/dashboard/DelegatePage';
import { ProtectedAdminRoute } from '@/features/dashboard/ProtectedAdminRoute';
import { ProtectedDelegueRoute } from '@/features/dashboard/ProtectedDelegueRoute';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProtectedDashboardRoute } from '@/features/dashboard/ProtectedDashboardRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedDashboardRoute>
              <DashboardPage />
            </ProtectedDashboardRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/delegue"
          element={
            <ProtectedDelegueRoute>
              <DelegatePage />
            </ProtectedDelegueRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
