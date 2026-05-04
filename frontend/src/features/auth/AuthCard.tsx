import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
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
    <div
      className={[
        'absolute z-10 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[92%] max-w-[760px] md:w-[46vw] md:max-w-[720px] p-8 md:p-14 rounded-2xl',
        'bg-[var(--auth-card-bg)] text-white backdrop-blur-[2px] shadow-[0_26px_80px_var(--auth-card-shadow)]',
        'transition-all duration-500 ease-in-out',
        isLogin ? 'left-1/2 md:left-[75%]' : 'left-1/2 md:left-[25%]',
      ].join(' ')}
    >
      <img
        src={logoUrl}
        alt="Let Note logo"
        className="mx-auto mb-6 h-12 w-auto rounded-md bg-white/90 p-1.5 shadow-md"
      />
      <h1 className="text-center text-5xl md:text-6xl tracking-[0.2em] uppercase">
        {isLogin ? 'Login' : 'Register'}
      </h1>

      <form className="mt-10 space-y-4 md:space-y-5" onSubmit={onSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Full name"
            value={fields.fullName}
            onChange={handleInputChange('fullName')}
            className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
          />
        )}
        {!isLogin && (
          <input
            type="date"
            value={fields.birthDate}
            onChange={handleInputChange('birthDate')}
            className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)]"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={fields.email}
          onChange={handleInputChange('email')}
          className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={fields.password}
          onChange={handleInputChange('password')}
          className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
        />
        {!isLogin && (
          <input
            type="password"
            placeholder="Confirm password"
            value={fields.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
          />
        )}

        <Button
          type="submit"
          variant="secondary"
          className="mx-auto mt-8 flex h-12 min-w-40 rounded-none bg-[var(--auth-button-bg)] text-[var(--auth-button-text)] hover:opacity-90"
        >
          {isLogin ? 'login' : 'register'}
        </Button>

        {submitState.message && (
          <p
            className={[
              'mx-auto mt-3 w-full max-w-[520px] text-center text-sm',
              submitState.type === 'success' ? 'text-green-100' : 'text-red-100',
            ].join(' ')}
          >
            {submitState.message}
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={onToggleMode}
        className="mt-7 block w-full text-center text-base underline underline-offset-4"
      >
        {isLogin ? 'Switch to register' : 'Switch to login'}
      </button>
    </div>
  );
}
