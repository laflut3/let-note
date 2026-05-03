import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const backgroundImageUrl = '/image/etudiant_login.jpg';
const logoUrl = '/image/logo.png';

export default function App() {
  const [mode, setMode] = useState('login');
  const [theme, setTheme] = useState('light');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isLogin = mode === 'login';
  const toggleMode = () => setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  const isDark = theme === 'dark';

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
        <button
          type="button"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold text-[#5b1a56] shadow-md backdrop-blur-md transition hover:bg-white/90 dark:border-white/20 dark:bg-[#281d31]/80 dark:text-[#f4e9ff]"
          aria-label="Switch theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light' : 'Dark'}
        </button>

        <div
          className={[
            'absolute inset-y-0 w-full md:w-1/2 bg-[var(--auth-split-panel)]',
            'transition-all duration-500 ease-in-out',
            isLogin ? 'left-0' : 'left-0 md:left-1/2',
          ].join(' ')}
        />

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

          <form
            className="mt-10 space-y-4 md:space-y-5"
            onSubmit={(event) => event.preventDefault()}
          >
            {!isLogin && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mx-auto block w-full max-w-[520px] h-12 md:h-14 px-4 rounded-none border-none bg-[var(--auth-input-bg)] text-[var(--auth-input-text)] placeholder:text-gray-500"
            />
            {!isLogin && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
          </form>

          <button
            type="button"
            onClick={toggleMode}
            className="mt-7 block w-full text-center text-base underline underline-offset-4"
          >
            {isLogin ? 'Switch to register' : 'Switch to login'}
          </button>
        </div>
      </section>
    </main>
  );
}
