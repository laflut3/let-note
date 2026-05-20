import { Button } from '@/components/ui/button';
import { adminUpdateUserRequest } from '@/features/auth/api';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

type Props = { controller: AdminController };

export function StudentsTab({ controller }: Props) {
  const {
    studentsDetails,
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
  } = controller;

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-4 sm:p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
      <h2 className="text-xl font-semibold text-zinc-900">Liste des etudiants</h2>
      <div className="mt-4 space-y-2">
        {studentsDetails.map((student) => (
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
                    className="h-10 rounded-lg border border-zinc-300 px-3"
                  />
                  <input
                    value={editStudentBirthDate}
                    onChange={(e) => setEditStudentBirthDate(e.target.value)}
                    type="date"
                    className="h-10 rounded-lg border border-zinc-300 px-3"
                  />
                  <input
                    value={editStudentPrenom}
                    onChange={(e) => setEditStudentPrenom(e.target.value)}
                    placeholder="Prenom"
                    className="h-10 rounded-lg border border-zinc-300 px-3"
                  />
                  <input
                    value={editStudentNom}
                    onChange={(e) => setEditStudentNom(e.target.value)}
                    placeholder="Nom"
                    className="h-10 rounded-lg border border-zinc-300 px-3"
                  />
                  <input
                    value={editStudentEmail}
                    onChange={(e) => setEditStudentEmail(e.target.value)}
                    placeholder="Email"
                    className="h-10 rounded-lg border border-zinc-300 px-3 sm:col-span-2"
                  />
                </div>
                <Button
                  type="button"
                  className="h-10 rounded-lg bg-zinc-900 text-white"
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
