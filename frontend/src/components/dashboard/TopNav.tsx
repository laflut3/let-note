import { Calendar, Home, LogOut, Shield, UserCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useThemeContext } from '@/context/theme-context';
import { adminUi } from '@/lib/admin-ui';

export type DashboardTab = 'accueil' | 'edt' | 'notes' | 'profil';

type TopNavProps = {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  hasDelegueScope: boolean;
  isAdmin: boolean;
  onDelegue: () => void;
  onAdmin: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export function TopNav({
  activeTab,
  setActiveTab,
  hasDelegueScope,
  isAdmin,
  onDelegue,
  onAdmin,
  onLogout,
  isLoggingOut,
}: TopNavProps) {
  const { theme, resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <nav className={adminUi.topNav}>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['accueil', 'Accueil'],
            ['edt', 'EDT'],
            ['notes', 'Notes'],
            ['profil', 'Profil'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              adminUi.topNavTab,
              activeTab === key ? adminUi.topNavTabActive : adminUi.topNavTabIdle,
            ].join(' ')}
          >
            {key === 'accueil' && <Home className="h-4 w-4" />}
            {key === 'edt' && <Calendar className="h-4 w-4" />}
            {key === 'notes' && <Users className="h-4 w-4" />}
            {key === 'profil' && <UserCircle className="h-4 w-4" />}
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasDelegueScope && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelegue}
            className={adminUi.topNavAction}
          >
            <Users className="h-4 w-4" />
            <span className="ml-1 hidden lg:inline">Delegue</span>
          </Button>
        )}
        {isAdmin && (
          <Button type="button" variant="ghost" onClick={onAdmin} className={adminUi.topNavAction}>
            <Shield className="h-4 w-4" />
            <span className="ml-1 hidden lg:inline">Admin</span>
          </Button>
        )}
        <Button
          onClick={onLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className={adminUi.topNavActionGhost}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-1 hidden lg:inline">
            {isLoggingOut ? 'Deconnexion...' : 'Logout'}
          </span>
        </Button>
        <ThemeToggle
          theme={theme}
          resolvedTheme={resolvedTheme}
          onToggle={toggleTheme}
          inline
          compactOnMobile
        />
      </div>
    </nav>
  );
}
