import { UeManagementSection } from '@/components/ue/UeManagementSection';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

const adminUeTheme = {
  panel: adminUi.panel,
  title: 'text-xl font-semibold text-foreground',
  input: adminUi.input,
  select:
    'h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-sm',
  primaryButton: adminUi.primaryBtn,
  row: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4',
  modalOverlay:
    'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm',
  modal:
    'w-full max-w-xl rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-6 shadow-2xl',
};

export function UesSection({ controller }: Props) {
  return (
    <UeManagementSection
      ueItems={controller.ueItems}
      newUeNom={controller.newUeNom}
      setNewUeNom={controller.setNewUeNom}
      newUeSemestre={controller.newUeSemestre}
      setNewUeSemestre={controller.setNewUeSemestre}
      editUeId={controller.editUeId}
      setEditUeId={controller.setEditUeId}
      editUeNom={controller.editUeNom}
      setEditUeNom={controller.setEditUeNom}
      editUeSemestre={controller.editUeSemestre}
      setEditUeSemestre={controller.setEditUeSemestre}
      onCreate={controller.handleCreateAdminUe}
      onUpdate={controller.handleUpdateAdminUe}
      onDelete={controller.handleDeleteAdminUe}
      onRefresh={controller.refreshAdminUes}
      onFeedback={controller.setFeedback}
      theme={adminUeTheme}
    />
  );
}
