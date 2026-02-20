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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-3">
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription>
            Informe uma nova senha para sua conta. Utilize o link enviado ao seu e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                className="w-full inline-flex items-center justify-center gap-2"
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
