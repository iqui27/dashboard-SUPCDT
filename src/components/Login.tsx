import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';

type LoginLocationState = {
  from?: Location;
  reason?: 'notAuthenticated';
};

const highlights = [
  'Acesso restrito às equipes autorizadas',
  'Monitoramento executivo e operacional em tempo real',
  'Base preparada para integração entre dashboards'
];

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
      ? 'Seu acesso expirou ou ainda não foi autenticado. Faça login para continuar.'
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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eaf4fb_0%,#f8fafc_40%,#eef6f2_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.18),transparent_28%),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.1fr)_520px]">
          <section className="hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(14,116,144,0.92))] p-8 text-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] xl:flex xl:flex-col xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                <ShieldCheck className="h-4 w-4" />
                SECTI DF
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-tight tracking-tight">
                Monitoramento profissional para a carteira da SUPCDT.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-sky-100/85">
                Ambiente institucional para acompanhar metas, vigência, cobertura territorial e a preparação operacional dos projetos. A autenticação é obrigatória para proteger a integridade dos dados.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {highlights.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <p className="mt-3 text-sm leading-6 text-sky-50/90">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <Card className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] px-6 py-7 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.85)]">
                    <LockKeyhole className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">Acesso autenticado</p>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Entrar no Dashboard SUPCDT</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
                  Use sua credencial institucional para acessar o ambiente de monitoramento. Não há acesso de teste nem atalhos administrativos visíveis nesta interface.
                </p>
              </div>

              <div className="px-6 py-7 sm:px-8">
                {infoMessage && (
                  <div className="mb-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {infoMessage}
                  </div>
                )}

                {error && (
                  <div className="mb-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-semibold text-slate-700">
                      Usuário ou e-mail
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="seu.usuario@secti.df.gov.br"
                      required
                      autoComplete="username"
                      autoFocus
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">
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
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !username.trim() || !password.trim()}
                    className="h-12 w-full rounded-full bg-slate-950 text-base font-semibold text-white hover:bg-slate-800"
                  >
                    {isLoading ? 'Autenticando...' : 'Entrar com credencial'}
                  </Button>
                </form>

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Recuperação de acesso</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Se você esqueceu a senha, use o fluxo de recuperação. Para novos acessos, a liberação continua centralizada pela administração do sistema.
                      </p>
                    </div>
                    <Link to="/forgot-password" className="whitespace-nowrap text-sm font-semibold text-sky-700 hover:text-sky-800">
                      Esqueci minha senha
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
