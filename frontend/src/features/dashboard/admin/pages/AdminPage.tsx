import { useNavigate } from 'react-router-dom';
import { AdminNav } from '@/features/dashboard/admin/sections/AdminNav';
import { AdminOverlays } from '@/features/dashboard/admin/sections/AdminOverlays';
import { ProfessorsTab } from '@/features/dashboard/admin/sections/ProfessorsTab';
import { PromotionsTab } from '@/features/dashboard/admin/sections/PromotionsTab';
import { StudentsTab } from '@/features/dashboard/admin/sections/StudentsTab';
import { SubjectsTab } from '@/features/dashboard/admin/sections/SubjectsTab';
import { adminUi } from '@/features/dashboard/admin/lib/ui';
import { useAdminController } from '@/features/dashboard/admin/useAdminController';

export function AdminPage() {
  const navigate = useNavigate();
  const controller = useAdminController(navigate);

  return (
    <main className={adminUi.pageBg}>
      <section className={adminUi.shell}>
        <AdminNav controller={controller} onDashboard={() => navigate('/dashboard')} />

        {controller.activeTab === 'promotions' && <PromotionsTab controller={controller} />}
        {controller.activeTab === 'professeurs' && <ProfessorsTab controller={controller} />}
        {controller.activeTab === 'etudiants' && <StudentsTab controller={controller} />}
        {controller.activeTab === 'matieres' && <SubjectsTab controller={controller} />}

        <AdminOverlays controller={controller} />

        {controller.loadingError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {controller.loadingError}
          </p>
        )}
        {controller.feedback.message && (
          <p
            className={[
              'rounded-xl border px-4 py-3 text-sm',
              controller.feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700',
            ].join(' ')}
          >
            {controller.feedback.message}
          </p>
        )}
      </section>
    </main>
  );
}
