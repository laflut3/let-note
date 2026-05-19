import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '@/features/auth/AuthPage';
import { AdminPage } from '@/features/dashboard/AdminPage';
import { ProtectedAdminRoute } from '@/features/dashboard/ProtectedAdminRoute';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProtectedDashboardRoute } from '@/features/dashboard/ProtectedDashboardRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
