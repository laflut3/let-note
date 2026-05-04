import { Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/features/auth/types';

type ThemeToggleProps = {
  theme: ThemeMode;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold text-[#5b1a56] shadow-md backdrop-blur-md transition hover:bg-white/90 dark:border-white/20 dark:bg-[#281d31]/80 dark:text-[#f4e9ff]"
      aria-label="Switch theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
