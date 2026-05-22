import { useNavigate } from 'react-router-dom';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminOverlays } from '@/components/admin/AdminOverlays';
import { ProfessorsTab } from '@/components/admin/ProfessorsSection';
import { PromotionsTab } from '@/components/admin/PromotionsSection';
import { StudentsTab } from '@/components/admin/StudentsSection';
import { SubjectsTab } from '@/components/admin/SubjectsSection';
import { UesSection } from '@/components/admin/UesSection';
import { DevoirsSection } from '@/components/devoirs/DevoirsSection';
import { adminUi } from '@/lib/admin-ui';
import { useAdminController } from '@/hooks/useAdminController';

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
        {controller.activeTab === 'ues' && <UesSection controller={controller} />}
        {controller.activeTab === 'devoirs' && (
          <DevoirsSection
            promotions={controller.promotions}
            matieres={controller.matieres}
            selectedPromoId={controller.selectedPromoId}
            onPromoChange={controller.setSelectedPromoId}
            onFeedback={controller.setFeedback}
            theme={{
              panel: adminUi.panel,
              title: 'text-xl font-semibold text-foreground',
              input: adminUi.input,
              select: adminUi.select,
              primaryButton: adminUi.primaryBtn,
              row: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4',
            }}
          />
        )}

        <AdminOverlays controller={controller} />

        {controller.loadingError && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200">
            {controller.loadingError}
          </p>
        )}
        {controller.feedback.message && (
          <p
            className={[
              'rounded-xl border px-4 py-3 text-sm',
              controller.feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200',
            ].join(' ')}
          >
            {controller.feedback.message}
          </p>
        )}
      </section>
    </main>
  );
}
