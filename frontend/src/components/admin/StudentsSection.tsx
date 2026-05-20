import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminUpdateUserRequest } from '@/services/api';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

export function StudentsTab({ controller }: Props) {
  const {
    filteredStudents,
    expandedStudentId,
    toggleStudentDetails,
    editStudentNumero,
    setEditStudentNumero,
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
  } = controller;

  return (
    <section className={adminUi.panel}>
      <h2 className="text-xl font-semibold text-violet-950">Liste des etudiants</h2>
      <ListControls
        className="mt-3"
        searchValue={studentSearch}
        onSearchChange={setStudentSearch}
        searchPlaceholder="Rechercher (nom, prenom, email, numero)"
        sortValue={studentSort}
        onSortChange={setStudentSort}
        resultCount={filteredStudents.length}
      />
      <div className="mt-4 space-y-2">
        {filteredStudents.map((student) => (
          <div key={student.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => toggleStudentDetails(student)}
            >
              <span className="text-sm text-zinc-800">
                {student.prenom} {student.nom} - roles: {student.roles.join(', ') || 'eleve'}
              </span>
              <span className="text-xs text-zinc-500">
                {expandedStudentId === student.id ? 'Masquer' : 'Details'}
              </span>
            </button>

            {expandedStudentId === student.id && (
              <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={editStudentNumero}
                    onChange={(e) => setEditStudentNumero(e.target.value)}
                    placeholder="Numero etudiant"
                    className={adminUi.input}
                  />
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
                  className="h-10 rounded-lg bg-violet-700 text-white hover:bg-violet-800"
                  onClick={() =>
                    void runAction(
                      () =>
                        adminUpdateUserRequest(student.id, {
                          numero_etudiant: editStudentNumero || undefined,
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
                <div className="text-sm text-zinc-700">
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
        ))}
      </div>
    </section>
  );
}
