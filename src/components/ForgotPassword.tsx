import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { requestPasswordReset } from '../lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function ForgotPassword() {
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!institutionalEmail.trim()) {
      setFeedback({ type: 'error', message: 'Informe o e-mail institucional.' });
      return;
    }

    if (!personalEmail.trim()) {
      setFeedback({ type: 'error', message: 'Informe o e-mail pessoal para receber o link.' });
      return;
    }

    if (!institutionalEmail.includes('@secti.df.gov.br')) {
      setFeedback({ type: 'error', message: 'O e-mail institucional deve ser do domínio @secti.df.gov.br' });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(institutionalEmail.trim(), personalEmail.trim());
      setFeedback({
        type: 'success',
        message: 'Se o e-mail institucional estiver cadastrado, enviaremos um link para o e-mail pessoal informado.'
      });
      setInstitutionalEmail('');
      setPersonalEmail('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível solicitar a redefinição.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-3">
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail institucional para localizarmos sua conta e um e-mail pessoal para receber o link de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {feedback && (
            <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>{feedback.type === 'error' ? 'Erro' : 'Tudo certo!'}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="institutional-email" className="text-sm font-medium text-foreground">
                E-mail institucional
              </label>
              <Input
                id="institutional-email"
                type="email"
                placeholder="usuario@secti.df.gov.br"
                value={institutionalEmail}
                onChange={event => setInstitutionalEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="personal-email" className="text-sm font-medium text-foreground">
                E-mail pessoal (para receber o link)
              </label>
              <Input
                id="personal-email"
                type="email"
                placeholder="seu-email@gmail.com"
                value={personalEmail}
                onChange={event => setPersonalEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full inline-flex items-center justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link de redefinição
            </Button>
          </form>

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
