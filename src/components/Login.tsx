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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.08),transparent_24%),linear-gradient(180deg,#f7fafc_0%,#eef3f8_100%)] text-foreground">
      <div className="flex min-h-screen items-center justify-center p-4">
        
        {/* Card principal */}
        <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.4)]">

          {/* Header */}
          <div className="border-b border-slate-100 bg-white/95 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700/70 leading-none">Acesso autenticado</p>
                <h2 className="mt-1 text-base font-bold text-slate-900 leading-tight">Entrar no Dashboard</h2>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white px-6 py-5">
            
            {/* Mensagem de info */}
            {infoMessage && (
              <div className="mb-4 rounded-[0.9rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {infoMessage}
              </div>
            )}

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-4 rounded-[0.9rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            )}

            {/* Campo usuário */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            {/* Campo senha */}
            <div className="mt-4 space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            {/* Botão submit */}
            <Button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="mt-5 h-9 w-full rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? 'Autenticando...' : 'Entrar'}
            </Button>

            {/* Link recuperação */}
            <div className="mt-4 text-center">
              <Link 
                to="/forgot-password" 
                className="text-xs font-medium text-slate-500 hover:text-sky-700"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>

          {/* Footer institucional */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500">
                SECTI — Secretaria de Ciência, Tecnologia e Inovação
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}