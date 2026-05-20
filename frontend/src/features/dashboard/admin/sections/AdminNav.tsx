import { BookOpen, GraduationCap, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminController, AdminTab } from '@/features/dashboard/admin/useAdminController';

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

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/90 p-4 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={[
              'rounded-xl border px-3 py-2 text-sm transition flex items-center gap-2',
              activeTab === value
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onDashboard} variant="outline" className="h-10 rounded-xl">
          Dashboard
        </Button>
        <Button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="h-10 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
        >
          {isLoggingOut ? 'Deconnexion...' : 'Logout'}
        </Button>
      </div>
    </nav>
  );
}
