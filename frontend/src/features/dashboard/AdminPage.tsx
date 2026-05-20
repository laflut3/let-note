import { useNavigate } from 'react-router-dom';
import { AdminNav } from '@/features/dashboard/admin/sections/AdminNav';
import { AdminOverlays } from '@/features/dashboard/admin/sections/AdminOverlays';
import { ProfessorsTab } from '@/features/dashboard/admin/sections/ProfessorsTab';
import { PromotionsTab } from '@/features/dashboard/admin/sections/PromotionsTab';
import { StudentsTab } from '@/features/dashboard/admin/sections/StudentsTab';
import { SubjectsTab } from '@/features/dashboard/admin/sections/SubjectsTab';
import { useAdminController } from '@/features/dashboard/admin/useAdminController';

export function AdminPage() {
  const navigate = useNavigate();
  const controller = useAdminController(navigate);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f1e7,#f2e7d5)] p-3 sm:p-5 md:p-8">
      <section className="mx-auto max-w-6xl w-full space-y-6">
        <AdminNav controller={controller} onDashboard={() => navigate('/dashboard')} />

        {controller.activeTab === 'promotions' && <PromotionsTab controller={controller} />}
        {controller.activeTab === 'professeurs' && <ProfessorsTab controller={controller} />}
        {controller.activeTab === 'etudiants' && <StudentsTab controller={controller} />}
        {controller.activeTab === 'matieres' && <SubjectsTab controller={controller} />}

        <AdminOverlays controller={controller} />

        {controller.loadingError && (
          <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">
            {controller.loadingError}
          </p>
        )}
        {controller.feedback.message && (
          <p
            className={[
              'rounded-lg px-3 py-2 text-sm',
              controller.feedback.type === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800',
            ].join(' ')}
          >
            {controller.feedback.message}
          </p>
        )}
      </section>
    </main>
  );
}
