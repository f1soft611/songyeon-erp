import { useSyncExternalStore } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProfileSettingsPage from '../pages/dashboard/ProfileSettingsPage';
import SecuritySettingsPage from '../pages/dashboard/SecuritySettingsPage';
import { F1GridDocsPage } from '../pages/f1-grid-docs/F1GridDocsPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { LogisticsScheduleTvPage, ProductionScheduleTvPage } from '../pages/co/schedule/ScheduleTvPages';
import {
  isAuthenticated,
  subscribeAuthChange,
} from '../shared/services/authService';

function useAuthState() {
  return useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false,
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthState();
  console.log('PublicRoute auth', isAuthed, 'path', window.location.pathname);

  return isAuthed ? <Navigate to="/" replace /> : <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthState();
  console.log(
    'ProtectedRoute auth',
    isAuthed,
    'path',
    window.location.pathname,
  );

  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/f1-grid-docs" element={<F1GridDocsPage />} />
      {/* 송연 현장 TV 화면: 작업장 TV 에는 로그인할 사람이 없어 로그인 없이 연다(송연과 같은 주소) */}
      <Route path="/tv/production" element={<ProductionScheduleTvPage />} />
      <Route path="/tv/logistics" element={<LogisticsScheduleTvPage />} />
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute>
            <ProfileSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/security"
        element={
          <ProtectedRoute>
            <SecuritySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groupware/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/co/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* 송연 모듈(/dash/dashboard, /sa/product …)과 모듈관리에서 새로 만든 모듈의 메뉴 주소(두 조각 이상).
          메뉴 표에 없는 주소는 DashboardPage 가 NotFound 로 보여주고, 한 조각짜리 모르는 주소는 아래 NotFound 로 간다. */}
      <Route
        path="/:moduleId/:menuId/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
