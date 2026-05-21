import { BookOpen, GraduationCap, Layers, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  ['ues', 'UE', Layers],
  ['devoirs', 'Devoirs', BookOpen],
];

export function AdminNav({ controller, onDashboard }: Props) {
  const { activeTab, setActiveTab, isLoggingOut, handleLogout } = controller;

  return (
    <nav className={`${adminUi.panel} flex flex-wrap items-center justify-between gap-3`}>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={[
              'rounded-xl border px-3 py-2 text-sm transition flex items-center gap-2',
              activeTab === value
                ? 'border-violet-700 bg-violet-700 text-white'
                : 'border-violet-200 bg-violet-50/50 text-violet-900 hover:border-violet-400',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onDashboard}
          variant="outline"
          className="h-10 rounded-xl border-violet-300"
        >
          Dashboard
        </Button>
        <Button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="h-10 rounded-xl bg-violet-900 px-5 text-white hover:bg-violet-950"
        >
          {isLoggingOut ? 'Deconnexion...' : 'Logout'}
        </Button>
      </div>
    </nav>
  );
}
