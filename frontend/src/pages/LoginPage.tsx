import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/auth/AuthCard';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useAuthForm } from '@/hooks/useAuthForm';
import type { AuthMode, ThemeMode } from '@/types/auth';

const backgroundImageUrl = '/image/etudiant_login.jpg';
const logoUrl = '/image/logo.png';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const navigate = useNavigate();

  const { fields, setField, submitState, clearSubmitState, submit } = useAuthForm({
    onLoginSuccess: () => {
      navigate('/dashboard');
    },
  });

  const isDark = theme === 'dark';

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

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
      <section className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden overflow-y-auto px-2 pb-4 pt-16 sm:px-4 sm:pt-20 md:px-8 md:py-8">
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,184,148,0.14),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(204,108,162,0.14),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(220,132,196,0.10),transparent_36%),radial-gradient(circle_at_78%_82%,rgba(120,108,240,0.12),transparent_42%)]" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[56vw] w-[56vw] min-h-[230px] min-w-[230px] max-h-[460px] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.24),rgba(255,255,255,0.02))] blur-[1px] md:h-[42vh] md:w-[42vh]" />

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
