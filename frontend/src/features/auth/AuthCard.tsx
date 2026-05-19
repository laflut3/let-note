import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const isRegister = !isLogin;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange =
    (field: keyof AuthFields) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      onFieldChange(field, event.target.value);
    };

  return (
    <Card
      className={[
        'auth-card relative z-20 mx-auto w-full max-w-[900px] rounded-[1.2rem] md:rounded-[1.5rem]',
        'border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] text-white backdrop-blur-xl shadow-[0_24px_70px_var(--auth-card-shadow)] md:shadow-[0_30px_90px_var(--auth-card-shadow)]',
      ].join(' ')}
    >
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6 md:px-8 md:pt-5">
        <img
          src={logoUrl}
          alt="Let Note logo"
          className={[
            'mx-auto mb-2.5 w-auto rounded-lg bg-white/90 p-1.5 shadow-md',
            isLogin ? 'h-9 md:h-10' : 'h-8 md:h-[2.125rem]',
          ].join(' ')}
        />
        <CardDescription className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--auth-muted-text)] sm:text-xs">
          Espace etudiant
        </CardDescription>
        <CardTitle
          className={[
            'text-center font-semibold uppercase tracking-[0.11em] leading-none',
            isLogin
              ? 'text-3xl sm:text-4xl md:text-[3.1rem]'
              : 'text-[2.35rem] sm:text-[2.45rem] md:text-[2.55rem]',
          ].join(' ')}
        >
          {isLogin ? 'Login' : 'Register'}
        </CardTitle>
        <CardDescription className="text-center text-sm text-[var(--auth-muted-text)] md:text-[0.98rem]">
          {isLogin
            ? 'Accedez a votre espace en quelques secondes.'
            : 'Creez votre compte pour commencer a utiliser Let Note.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <form
          className={[
            'mt-2.5',
            isLogin ? 'space-y-4 md:space-y-[1.1rem]' : 'space-y-3 md:space-y-[0.82rem]',
          ].join(' ')}
          onSubmit={onSubmit}
        >
          {!isLogin && (
            <div className="mx-auto w-full max-w-[620px]">
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
            <div className="mx-auto w-full max-w-[620px]">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={fields.birthDate}
                onChange={handleInputChange('birthDate')}
              />
            </div>
          )}

          <div className="mx-auto w-full max-w-[620px]">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="prenom.nom@ecole.fr"
              value={fields.email}
              onChange={handleInputChange('email')}
            />
          </div>

          <div className="mx-auto w-full max-w-[620px]">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caracteres"
                value={fields.password}
                onChange={handleInputChange('password')}
                className="pr-12"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-slate-300/70 bg-white/90 p-1.5 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="mx-auto w-full max-w-[620px]">
              <Label htmlFor="confirmPassword">Confirmation</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Saisissez a nouveau le mot de passe"
                  value={fields.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  className="pr-12"
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? 'Masquer la confirmation du mot de passe'
                      : 'Afficher la confirmation du mot de passe'
                  }
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-slate-300/70 bg-white/90 p-1.5 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="mx-auto mt-[1.125rem] flex h-11 w-full max-w-[620px] rounded-xl bg-[var(--auth-button-bg)] text-[var(--auth-button-text)] font-semibold tracking-wide shadow-[0_12px_30px_var(--auth-button-shadow)] hover:opacity-95 md:mt-5 md:h-12"
          >
            {isLogin ? 'Se connecter' : 'Creer mon compte'}
          </Button>

          {submitState.message && (
            <p
              className={[
                'mx-auto mt-2 w-full max-w-[620px] rounded-lg px-3 py-2 text-center text-sm',
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
            className={[
              'block w-full text-center text-sm text-[var(--auth-muted-text)] underline underline-offset-4 transition hover:text-white md:text-base',
              isRegister ? 'mt-4 md:mt-[1.125rem]' : 'mt-5 md:mt-6',
            ].join(' ')}
          >
            {isLogin ? 'Pas encore de compte ? Creer un compte' : 'Deja inscrit ? Se connecter'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
