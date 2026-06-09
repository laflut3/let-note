import { BookOpen, GraduationCap, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useThemeContext } from '@/context/theme-context';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController, AdminTab } from '@/hooks/useAdminController';

type Props = {
  controller: AdminController;
  onDashboard: () => void;
};

const tabs: Array<[AdminTab, string, typeof GraduationCap]> = [
  ['promotions', 'Promotions', GraduationCap],
  ['etudiants', 'Etudiants', Users],
  ['professeurs', 'Professeurs', User],
  ['matieres', 'Matieres', BookOpen],
];

export function AdminNav({ controller, onDashboard }: Props) {
  const { activeTab, setActiveTab, isLoggingOut, handleLogout } = controller;
  const { theme, resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <nav className={adminUi.topNav}>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={[
              adminUi.topNavTab,
              activeTab === value ? adminUi.topNavTabActive : adminUi.topNavTabIdle,
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onDashboard}
          variant="ghost"
          className={adminUi.topNavAction}
        >
          <span className="hidden lg:inline">Dashboard</span>
          <span className="lg:hidden">Dash</span>
        </Button>
        <Button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className={adminUi.topNavActionGhost}
        >
          <span className="hidden lg:inline">{isLoggingOut ? 'Deconnexion...' : 'Logout'}</span>
          <span className="lg:hidden">{isLoggingOut ? '...' : 'Out'}</span>
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
