import { Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/types/auth';

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
      className="absolute right-4 top-4 md:right-7 md:top-7 z-20 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/75 px-3.5 py-2 text-sm font-semibold text-[#4f174c] shadow-lg backdrop-blur-md transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 dark:border-white/20 dark:bg-[#281d31]/85 dark:text-[#f4e9ff]"
      aria-label="Switch theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
