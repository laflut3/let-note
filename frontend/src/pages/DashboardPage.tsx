import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '@/components/dashboard/TopNav';
import { PromoHeader } from '@/components/dashboard/PromoHeader';
import { PromotionPills } from '@/components/dashboard/PromotionPills';
import { PromotionListSidebar } from '@/components/dashboard/PromotionListSidebar';
import { TodayScheduleModule } from '@/components/dashboard/TodayScheduleModule';
import { HomeworkModule } from '@/components/dashboard/HomeworkModule';
import { RecentNotesModule } from '@/components/dashboard/RecentNotesModule';
import { SubjectsModule } from '@/components/dashboard/SubjectsModule';
import { StudentProfileModule } from '@/components/dashboard/StudentProfileModule';
import { WeeklyScheduleModule } from '@/components/dashboard/WeeklyScheduleModule';
import { ResultsModule } from '@/components/dashboard/ResultsModule';
import { useDashboardController } from '@/hooks/useDashboardController';

export function DashboardPage() {
  const navigate = useNavigate();
  const controller = useDashboardController(navigate);
  const [weekOffset, setWeekOffset] = useState(0);

  const safeAllEvents = Array.isArray(controller.allEvents) ? controller.allEvents : [];
  const safeTodayEvents = Array.isArray(controller.todayEvents) ? controller.todayEvents : [];

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-6">
      <section className="mx-auto max-w-[1780px] space-y-4">
        <TopNav
          activeTab={controller.activeTab}
          setActiveTab={controller.setActiveTab}
          hasDelegueScope={controller.hasDelegueScope}
          isAdmin={controller.isAdmin}
          onDelegue={() => navigate('/delegue')}
          onAdmin={() => navigate('/admin')}
          onLogout={controller.handleLogout}
          isLoggingOut={controller.isLoggingOut}
        />

        {controller.activeTab === 'accueil' && (
          <section className="rounded-3xl border border-zinc-300 bg-white/85 p-4">
            <PromoHeader
              promoLabel={controller.promoLabel}
              referentPrenom={controller.dashboard?.promotion.referent_prof_prenom}
              referentNom={controller.dashboard?.promotion.referent_prof_nom}
            />

            <div className="grid gap-4 xl:grid-cols-[72px_1fr_1.4fr]">
              <PromotionPills
                promotions={controller.promotions}
                selectedPromoId={controller.selectedPromoId}
                onSelectPromo={controller.setSelectedPromoId}
              />

              <div className="space-y-4">
                <TodayScheduleModule
                  isLoadingSchedule={controller.isLoadingSchedule}
                  scheduleError={controller.scheduleError}
                  events={safeTodayEvents}
                />
                <HomeworkModule dashboard={controller.dashboard} />
                <RecentNotesModule dashboard={controller.dashboard} />
              </div>

              <div className="space-y-4">
                <SubjectsModule dashboard={controller.dashboard} />
              </div>
            </div>
          </section>
        )}

        {controller.activeTab !== 'accueil' && controller.activeTab !== 'profil' && (
          <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
            <PromotionListSidebar
              promotions={controller.promotions}
              selectedPromoId={controller.selectedPromoId}
              onSelectPromo={controller.setSelectedPromoId}
            />

            <section className="space-y-4">
              {controller.activeTab === 'edt' && (
                <WeeklyScheduleModule
                  allEvents={safeAllEvents}
                  weekOffset={weekOffset}
                  setWeekOffset={setWeekOffset}
                />
              )}

              {controller.activeTab === 'notes' && (
                <ResultsModule
                  dashboard={controller.dashboard}
                  promoId={controller.selectedPromoId}
                  onSaved={controller.refreshDashboard}
                />
              )}
            </section>
          </div>
        )}

        {controller.activeTab === 'profil' && (
          <section className="mx-auto w-full max-w-3xl">
            <StudentProfileModule
              profileForm={controller.profileForm}
              setProfileForm={controller.setProfileForm}
              saveProfile={controller.saveProfile}
              uploadProfilePhoto={controller.uploadProfilePhoto}
              isSavingProfile={controller.isSavingProfile}
              profileMessage={controller.profileMessage}
            />
          </section>
        )}
      </section>
    </main>
  );
}
