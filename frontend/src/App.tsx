import { useEffect, useState, type FormEvent } from 'react';
import { AuthCard } from '@/features/auth/AuthCard';
import { ThemeToggle } from '@/features/auth/ThemeToggle';
import { useAuthForm } from '@/features/auth/useAuthForm';
import type { AuthMode, ThemeMode } from '@/features/auth/types';

const backgroundImageUrl = '/image/etudiant_login.jpg';
const logoUrl = '/image/logo.png';

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const { fields, setField, submitState, clearSubmitState, submit } = useAuthForm();

  const isLogin = mode === 'login';
  const toggleMode = () => setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  const isDark = theme === 'dark';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    clearSubmitState();
    await submit(mode);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <main
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(var(--auth-overlay), var(--auth-overlay)), url(${backgroundImageUrl})`,
      }}
    >
      <section className="relative min-h-screen w-full grid place-items-center">
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />

        <div
          className={[
            'absolute inset-y-0 w-full md:w-1/2 bg-[var(--auth-split-panel)]',
            'transition-all duration-500 ease-in-out',
            isLogin ? 'left-0' : 'left-0 md:left-1/2',
          ].join(' ')}
        />

        <AuthCard
          mode={mode}
          fields={fields}
          submitState={submitState}
          logoUrl={logoUrl}
          onFieldChange={setField}
          onSubmit={handleSubmit}
          onToggleMode={toggleMode}
        />
      </section>
    </main>
  );
}
