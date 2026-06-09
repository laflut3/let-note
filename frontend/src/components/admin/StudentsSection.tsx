import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminDeleteUserRequest, adminUpdateUserRequest } from '@/services/api';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

export function StudentsTab({ controller }: Props) {
  const {
    filteredStudents,
    expandedStudentId,
    toggleStudentDetails,
    editStudentBirthDate,
    setEditStudentBirthDate,
    editStudentPrenom,
    setEditStudentPrenom,
    editStudentNom,
    setEditStudentNom,
    editStudentEmail,
    setEditStudentEmail,
    runAction,
    studentSearch,
    setStudentSearch,
    studentSort,
    setStudentSort,
    selectedStudentIdsForDelete,
    toggleStudentForDelete,
    setStudentsForDeleteBulk,
    handleDeleteSelectedStudents,
    openConfirmDialog,
  } = controller;

  const allFilteredSelected =
    filteredStudents.filter((student) => !student.roles.includes('admin')).length > 0 &&
    filteredStudents
      .filter((student) => !student.roles.includes('admin'))
      .every((student) => selectedStudentIdsForDelete.includes(student.id));

  return (
    <section className={adminUi.panel}>
      <h2 className="text-xl font-semibold text-foreground">Liste des etudiants</h2>
      <ListControls
        className="mt-3"
        searchValue={studentSearch}
        onSearchChange={setStudentSearch}
        searchPlaceholder="Rechercher (nom, prenom, email)"
        sortValue={studentSort}
        onSortChange={setStudentSort}
        resultCount={filteredStudents.length}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg"
          onClick={() => {
            if (allFilteredSelected) {
              setStudentsForDeleteBulk(
                filteredStudents
                  .filter((student) => !student.roles.includes('admin'))
                  .map((student) => student.id),
                false
              );
              return;
            }
            setStudentsForDeleteBulk(
              filteredStudents
                .filter((student) => !student.roles.includes('admin'))
                .map((student) => student.id),
              true
            );
          }}
        >
          {allFilteredSelected ? 'Tout deselectionner' : 'Tout selectionner (resultats filtres)'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
          disabled={selectedStudentIdsForDelete.length === 0}
          onClick={() => {
            openConfirmDialog({
              title: 'Supprimer des comptes etudiants',
              description: `Confirmer la suppression de ${selectedStudentIdsForDelete.length} compte(s) etudiant(s) ?`,
              confirmLabel: 'Supprimer la selection',
              isDanger: true,
              onConfirm: () => {
                void handleDeleteSelectedStudents();
              },
            });
          }}
        >
          Supprimer la selection ({selectedStudentIdsForDelete.length})
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {filteredStudents.map((student) => {
          const isAdminAccount = student.roles.includes('admin');
          return (
            <div
              key={student.id}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
            >
              <div className="flex w-full items-center justify-between gap-2 text-left">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedStudentIdsForDelete.includes(student.id)}
                    onChange={() => toggleStudentForDelete(student.id)}
                    disabled={isAdminAccount}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  <span className="text-sm text-foreground">
                    {student.prenom} {student.nom} - roles: {student.roles.join(', ') || 'eleve'}
                  </span>
                  {isAdminAccount && (
                    <span className="text-xs text-muted-foreground">
                      (suppression bloquee: admin)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground"
                  onClick={() => toggleStudentDetails(student)}
                >
                  {expandedStudentId === student.id ? 'Masquer' : 'Details'}
                </button>
              </div>

              {expandedStudentId === student.id && (
                <div className="mt-3 space-y-3 border-t border-[var(--surface-border)] pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={editStudentBirthDate}
                      onChange={(e) => setEditStudentBirthDate(e.target.value)}
                      type="date"
                      className={adminUi.input}
                    />
                    <input
                      value={editStudentPrenom}
                      onChange={(e) => setEditStudentPrenom(e.target.value)}
                      placeholder="Prenom"
                      className={adminUi.input}
                    />
                    <input
                      value={editStudentNom}
                      onChange={(e) => setEditStudentNom(e.target.value)}
                      placeholder="Nom"
                      className={adminUi.input}
                    />
                    <input
                      value={editStudentEmail}
                      onChange={(e) => setEditStudentEmail(e.target.value)}
                      placeholder="Email"
                      className={`${adminUi.input} sm:col-span-2`}
                    />
                  </div>
                  <Button
                    type="button"
                    className="h-10 rounded-lg bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
                    onClick={() =>
                      void runAction(
                        () =>
                          adminUpdateUserRequest(student.id, {
                            prenom: editStudentPrenom,
                            nom: editStudentNom,
                            email: editStudentEmail,
                            date_naissance: editStudentBirthDate || undefined,
                          }),
                        'Etudiant modifie.'
                      )
                    }
                  >
                    Enregistrer les modifications
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={isAdminAccount}
                    onClick={() => {
                      openConfirmDialog({
                        title: 'Supprimer le compte etudiant',
                        description: `Confirmer la suppression du compte de ${student.prenom} ${student.nom} ?`,
                        confirmLabel: 'Supprimer',
                        isDanger: true,
                        onConfirm: () => {
                          void runAction(
                            () => adminDeleteUserRequest(student.id),
                            'Compte etudiant supprime.'
                          );
                        },
                      });
                    }}
                  >
                    Supprimer ce compte
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <p>Promotions:</p>
                    <ul className="ml-4 list-disc">
                      {student.promotions.length === 0 && <li>Aucune promotion</li>}
                      {student.promotions.map((promo) => (
                        <li key={promo.promo_id}>
                          {promo.promo_nom} ({promo.annee_arrivee}-{promo.annee_depart}) -{' '}
                          {promo.is_delegue ? 'Delegue' : 'Non delegue'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
