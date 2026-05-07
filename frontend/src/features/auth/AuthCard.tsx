import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthFields, AuthMode, SubmitState } from '@/features/auth/types';

type AuthCardProps = {
  mode: AuthMode;
  fields: AuthFields;
  submitState: SubmitState;
  logoUrl: string;
  onFieldChange: (field: keyof AuthFields, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleMode: () => void;
};

export function AuthCard({
  mode,
  fields,
  submitState,
  logoUrl,
  onFieldChange,
  onSubmit,
  onToggleMode,
}: AuthCardProps) {
  const isLogin = mode === 'login';

  const handleInputChange =
    (field: keyof AuthFields) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      onFieldChange(field, event.target.value);
    };

  return (
    <Card
      className={[
        'auth-card relative z-20 mx-auto mt-20 w-full max-w-[760px] rounded-[1.6rem] md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:w-[46vw] md:max-w-[720px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.9rem]',
        'border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] text-white backdrop-blur-xl shadow-[0_24px_70px_var(--auth-card-shadow)] md:shadow-[0_30px_90px_var(--auth-card-shadow)]',
      ].join(' ')}
    >
      <CardHeader className="px-5 pb-2 pt-6 sm:px-6 md:px-10 md:pt-10">
        <img
          src={logoUrl}
          alt="Let Note logo"
          className="mx-auto mb-3 h-10 w-auto rounded-lg bg-white/90 p-1.5 shadow-md md:h-11"
        />
        <CardDescription className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--auth-muted-text)] sm:text-xs">
          Espace etudiant
        </CardDescription>
        <CardTitle className="text-center text-3xl font-semibold uppercase tracking-[0.12em] sm:text-4xl md:text-5xl md:tracking-[0.14em]">
          {isLogin ? 'Login' : 'Register'}
        </CardTitle>
        <CardDescription className="text-center text-sm text-[var(--auth-muted-text)] md:text-base">
          {isLogin
            ? 'Accedez a votre espace en quelques secondes.'
            : 'Creez votre compte pour commencer a utiliser Let Note.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-6 sm:px-6 md:px-10 md:pb-10">
        <form className="mt-3 space-y-3.5 md:mt-4 md:space-y-5" onSubmit={onSubmit}>
          {!isLogin && (
            <div className="mx-auto w-full max-w-[520px]">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ex: Lea Martin"
                value={fields.fullName}
                onChange={handleInputChange('fullName')}
              />
            </div>
          )}

          {!isLogin && (
            <div className="mx-auto w-full max-w-[520px]">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={fields.birthDate}
                onChange={handleInputChange('birthDate')}
              />
            </div>
          )}

          <div className="mx-auto w-full max-w-[520px]">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="prenom.nom@ecole.fr"
              value={fields.email}
              onChange={handleInputChange('email')}
            />
          </div>

          <div className="mx-auto w-full max-w-[520px]">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 caracteres"
              value={fields.password}
              onChange={handleInputChange('password')}
            />
          </div>

          {!isLogin && (
            <div className="mx-auto w-full max-w-[520px]">
              <Label htmlFor="confirmPassword">Confirmation</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Saisissez a nouveau le mot de passe"
                value={fields.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
              />
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="mx-auto mt-5 flex h-11 w-full max-w-[520px] rounded-xl bg-[var(--auth-button-bg)] text-[var(--auth-button-text)] font-semibold tracking-wide shadow-[0_12px_30px_var(--auth-button-shadow)] hover:opacity-95 md:mt-7 md:h-12"
          >
            {isLogin ? 'Se connecter' : 'Creer mon compte'}
          </Button>

          {submitState.message && (
            <p
              className={[
                'mx-auto mt-2 w-full max-w-[520px] rounded-lg px-3 py-2 text-center text-sm',
                submitState.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-100'
                  : 'bg-rose-500/20 text-rose-100',
              ].join(' ')}
            >
              {submitState.message}
            </p>
          )}

          <button
            type="button"
            onClick={onToggleMode}
            className="mt-5 block w-full text-center text-sm text-[var(--auth-muted-text)] underline underline-offset-4 transition hover:text-white md:mt-6 md:text-base"
          >
            {isLogin ? 'Pas encore de compte ? Creer un compte' : 'Deja inscrit ? Se connecter'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
