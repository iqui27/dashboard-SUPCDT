import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { resetPassword } from '../lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'A senha deve ter no mínimo 8 caracteres.';
  }

  return null;
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const passwordError = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isTokenMissing = !token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (isTokenMissing) {
      setFeedback({ type: 'error', message: 'Token inválido. Solicite uma nova redefinição.' });
      return;
    }

    const error = validatePassword(password);
    if (error) {
      setFeedback({ type: 'error', message: error });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'As senhas informadas não coincidem.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setFeedback({ type: 'success', message: 'Senha atualizada com sucesso. Redirecionando para o login...' });
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[linear-gradient(135deg,#eaf4fb_0%,#f8fafc_40%,#eef6f2_100%)] px-4">
      <Card className="w-full max-w-lg rounded-[1.75rem] border border-border/80 bg-card/88 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <CardHeader className="space-y-3 border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] px-6 py-6 text-center sm:px-8">
          <CardTitle className="text-[1.75rem] font-extrabold tracking-tight text-foreground">Definir nova senha</CardTitle>
          <CardDescription>
            Informe uma nova senha para sua conta. Utilize o link enviado ao seu e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 py-6 sm:px-8">
          {feedback && (
            <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>{feedback.type === 'error' ? 'Erro' : 'Tudo certo!'}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          {isTokenMissing ? (
            <Alert variant="destructive">
              <AlertTitle>Token ausente</AlertTitle>
              <AlertDescription>
                O link de redefinição é inválido ou expirou. Solicite uma nova redefinição.
              </AlertDescription>
            </Alert>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="reset-password" className="text-sm font-medium text-foreground">
                  Nova senha
                </label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Digite a nova senha"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
                {password && passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-confirm" className="text-sm font-medium text-foreground">
                  Confirmar nova senha
                </label>
                <Input
                  id="reset-confirm"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">As senhas precisam ser iguais.</p>
                )}
              </div>

              <Button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-white hover:bg-primary/90"
                disabled={isSubmitting || Boolean(passwordError) || !passwordsMatch}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Atualizar senha
              </Button>
            </form>
          )}

          <div className="flex justify-between text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Voltar para o login
            </Link>
            <Link to="/" className="hover:underline">
              Ir para a página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
