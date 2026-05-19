import { useEffect, useRef, useState, type FormEvent } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '@/features/auth/AuthCard';
import { ThemeToggle } from '@/features/auth/ThemeToggle';
import { useAuthForm } from '@/features/auth/useAuthForm';
import type { AuthMode, ThemeMode } from '@/features/auth/types';

const backgroundImageUrl = '/image/etudiant_login.jpg';
const logoUrl = '/image/logo.png';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const pageRef = useRef<HTMLElement | null>(null);
  const shapeRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { fields, setField, submitState, clearSubmitState, submit } = useAuthForm({
    onLoginSuccess: () => {
      navigate('/dashboard');
    },
  });

  const isLogin = mode === 'login';
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

  useEffect(() => {
    if (!pageRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.auth-fade',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!pageRef.current || !shapeRef.current || !glowRef.current) {
      return;
    }

    const card = pageRef.current.querySelector('.auth-card');
    if (!card) {
      return;
    }

    const isDesktop = window.innerWidth >= 768;
    const cardX = isDesktop ? (isLogin ? 120 : -120) : 0;
    const shapeX = isDesktop ? (isLogin ? -300 : 300) : 0;

    gsap.to(shapeRef.current, {
      x: shapeX,
      rotation: isDesktop ? (isLogin ? -6 : 6) : 0,
      duration: isDesktop ? 0.95 : 0.4,
      ease: 'expo.inOut',
      overwrite: 'auto',
    });

    gsap.to(glowRef.current, {
      x: shapeX * 0.75,
      duration: isDesktop ? 1.05 : 0.4,
      ease: 'expo.inOut',
      overwrite: 'auto',
    });

    gsap.to(card, {
      x: cardX,
      duration: isDesktop ? 0.95 : 0.35,
      ease: isDesktop ? 'expo.inOut' : 'power2.out',
      overwrite: 'auto',
    });

    gsap.fromTo(
      card,
      { scale: isDesktop ? 0.985 : 0.995, filter: isDesktop ? 'blur(2px)' : 'blur(0px)' },
      { scale: 1, filter: 'blur(0px)', duration: 0.36, ease: 'power2.out', overwrite: 'auto' }
    );
  }, [isLogin]);

  return (
    <main
      ref={pageRef}
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(var(--auth-overlay), var(--auth-overlay)), url(${backgroundImageUrl})`,
      }}
    >
      <section className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto px-3 pb-6 pt-6 sm:px-4 sm:pt-8 md:px-8 md:py-10">
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_85%_90%,rgba(255,210,170,0.14),transparent_33%)]" />

        <div
          ref={glowRef}
          className="auth-fade pointer-events-none absolute left-1/2 top-[46%] h-[70vw] w-[70vw] min-h-[220px] min-w-[220px] max-h-[520px] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[42%_58%_64%_36%/40%_43%_57%_60%] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.26),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(255,160,140,0.24),transparent_40%)] blur-[6px] md:top-1/2 md:h-[58vh] md:w-[58vh] md:max-h-[640px] md:max-w-[640px]"
        />

        <div
          ref={shapeRef}
          className="auth-fade pointer-events-none absolute left-1/2 top-[46%] h-[78vw] w-[78vw] min-h-[240px] min-w-[240px] max-h-[560px] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[38%_62%_55%_45%/42%_34%_66%_58%] border border-white/20 bg-[linear-gradient(145deg,var(--auth-split-panel),#8e365f_58%,#b0447a)] shadow-[0_30px_80px_rgba(0,0,0,0.32)] md:top-1/2 md:h-[62vh] md:w-[62vh] md:max-h-[690px] md:max-w-[690px] md:shadow-[0_45px_120px_rgba(0,0,0,0.34)]"
        />

        <div className="auth-fade relative z-30 mx-auto w-fit rounded-full border border-white/25 bg-black/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-white backdrop-blur-sm sm:text-xs md:absolute md:left-1/2 md:top-14 md:-translate-x-1/2 md:px-4 md:py-2">
          Let Note Etudiant
        </div>

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
