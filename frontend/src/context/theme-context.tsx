import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '@/types/auth';

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeContextProvider({
  value,
  children,
}: {
  value: ThemeContextValue;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeContextProvider');
  }
  return context;
}
