import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

type LoginLocationState = {
  from?: Location;
  reason?: 'notAuthenticated';
};

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? '/';
  const infoMessage =
    locationState?.reason === 'notAuthenticated'
      ? 'Seu acesso expirou. Faça login para continuar.'
      : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-theme-surface="login-shell"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_26%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.12),transparent_24%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] text-foreground transition-colors"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          data-theme-surface="login-card"
          className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_40px_100px_-30px_hsl(var(--foreground)/0.35)] backdrop-blur-xl transition-colors"
        >
          <div className="border-b border-border/70 bg-card/95 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--accent))_100%)] text-primary-foreground shadow-sm shadow-primary/20">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-primary/80">Acesso autenticado</p>
                <h1 className="mt-1 text-base font-bold leading-tight text-foreground">Entrar no Dashboard</h1>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-card px-6 py-5 transition-colors">
            {infoMessage && (
              <div className="mb-4 rounded-[0.9rem] border border-amber-500/30 bg-warning/100/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {infoMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-[0.9rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu.usuario"
                required
                autoComplete="username"
                autoFocus
                className="h-9 w-full rounded-full border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
                className="h-9 w-full rounded-full border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="mt-5 h-9 w-full rounded-full px-4 text-xs"
            >
              {isLoading ? 'Autenticando...' : 'Entrar'}
            </Button>

            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>

          <div className="border-t border-border/70 bg-secondary/40 px-6 py-4 transition-colors">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">
                SECTI — Secretaria de Ciência, Tecnologia e Inovação
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
