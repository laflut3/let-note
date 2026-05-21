import { useEffect, useState } from 'react';
import type { ThemeMode } from '@/types/auth';

const THEME_KEY = 'let-note-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, resolvedTheme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system'));

  return { theme, resolvedTheme, toggleTheme, setTheme };
}
