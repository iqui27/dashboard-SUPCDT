import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { FullScreenStatus } from './components/FullScreenStatus';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

const App = lazy(() => import('./App').then((module) => ({ default: module.App })));
const Login = lazy(() => import('./components/Login').then((module) => ({ default: module.Login })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then((module) => ({ default: module.ResetPassword })));

function LoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenStatus title="Carregando sessão" description="Verificando seu acesso institucional." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<FullScreenStatus title="Abrindo login" description="Preparando a autenticação institucional." />}>
      <Login />
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<FullScreenStatus title="Carregando recuperação" description="Preparando o fluxo de redefinição de senha." />}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<FullScreenStatus title="Validando link" description="Preparando a redefinição da sua senha." />}>
                  <ResetPassword />
                </Suspense>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<FullScreenStatus title="Abrindo dashboard" description="Carregando o ambiente institucional." />}>
                    <App />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
