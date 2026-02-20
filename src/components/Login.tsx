import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useNavigate, useLocation, type Location } from 'react-router-dom';

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
  const infoMessage = locationState?.reason === 'notAuthenticated'
    ? 'Você precisa estar logado para acessar essa página.'
    : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

  const handleTestLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Login com as credenciais padrões de admin
      await login('admin', '844612');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login de teste';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <img
                src="/logo-secti.png"
                alt="Logo SECTI"
                className="h-20 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard SUPCDT</h1>
            <p className="text-sm text-muted-foreground">Faça login para continuar</p>
          </div>

          {infoMessage && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Usuário ou E-mail
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário ou e-mail"
                required
                autoComplete="username"
                autoFocus
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full h-11 text-base mt-6"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleTestLogin}
              className="w-full h-11 text-base mt-4"
            >
              Testar sem login (Admin)
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border space-y-2">
            <p className="text-sm text-center">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Para novos acessos, entre em contato com o administrador do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

