import { Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/types/auth';

type ThemeToggleProps = {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
  inline?: boolean;
  compactOnMobile?: boolean;
};

export function ThemeToggle({
  theme,
  resolvedTheme,
  onToggle,
  className,
  inline = false,
  compactOnMobile = false,
}: ThemeToggleProps) {
  const isDark = resolvedTheme === 'dark';
  const label =
    theme === 'system' ? `Auto (${isDark ? 'Dark' : 'Light'})` : isDark ? 'Dark' : 'Light';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        inline
          ? 'inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
          : 'fixed right-3 top-3 z-[120] inline-flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-md transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:right-5 sm:top-5',
        className ?? '',
      ].join(' ')}
      aria-label="Switch theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className={compactOnMobile ? 'hidden lg:inline' : ''}>{label}</span>
    </button>
  );
}
