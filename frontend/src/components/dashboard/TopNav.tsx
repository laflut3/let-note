import { Calendar, Home, LogOut, Shield, UserCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--auth-card-border)] bg-[linear-gradient(135deg,#4f1730,#6d2745)] px-4 py-3 text-white shadow-[0_16px_38px_rgba(36,14,30,0.28)]">
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
              'rounded-lg px-3 py-1.5 text-sm transition flex items-center gap-2',
              activeTab === key ? 'bg-white/20 font-semibold' : 'hover:bg-white/10',
            ].join(' ')}
          >
            {key === 'accueil' && <Home className="h-4 w-4" />}
            {key === 'edt' && <Calendar className="h-4 w-4" />}
            {key === 'notes' && <Users className="h-4 w-4" />}
            {key === 'profil' && <UserCircle className="h-4 w-4" />}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {hasDelegueScope && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelegue}
            className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-1">Delegue</span>
          </Button>
        )}
        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            onClick={onAdmin}
            className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-1">Admin</span>
          </Button>
        )}
        <Button
          onClick={onLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className="h-9 rounded-lg text-white hover:bg-white/12 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline sm:ml-1">
            {isLoggingOut ? 'Deconnexion...' : 'Logout'}
          </span>
        </Button>
      </div>
    </nav>
  );
}
