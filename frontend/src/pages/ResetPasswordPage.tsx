import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '@/services/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsSuccess(false);

    if (!token) {
      setMessage('Lien invalide.');
      return;
    }
    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!understood) {
      setMessage('Vous devez confirmer avoir compris le changement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPasswordRequest({
        token,
        password,
        confirm_password: confirmPassword,
        understood,
      });
      if (!response.ok) {
        setMessage('Lien invalide ou expire.');
        return;
      }
      setIsSuccess(true);
      setMessage('Mot de passe modifie. Vous pouvez vous connecter.');
    } catch {
      setMessage('Erreur reseau. Reessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-1)] px-4 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            placeholder="Nouveau mot de passe"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
            placeholder="Confirmer le nouveau mot de passe"
          />
          <label className="flex gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-1"
            />
            <span>J'ai bien compris que mon ancien mot de passe ne fonctionnera plus.</span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="h-10 w-full rounded-xl bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white hover:bg-[var(--surface-strong-hover)] disabled:opacity-60"
          >
            {isSubmitting ? 'Modification...' : 'Valider'}
          </button>
        </form>
        {message ? (
          <p
            className={[
              'mt-3 rounded-xl px-3 py-2 text-sm',
              isSuccess ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700',
            ].join(' ')}
          >
            {message}
          </p>
        ) : null}
        <Link to="/" className="mt-4 inline-flex text-sm underline underline-offset-4">
          Retour connexion
        </Link>
      </section>
    </main>
  );
}
