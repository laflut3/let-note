import { Button } from '@/components/ui/button';
import {
  adminAddStudentToPromotionRequest,
  adminRemoveStudentFromPromotionRequest,
  adminUpdateProfesseurRequest,
  adminUpdatePromotionRequest,
} from '@/features/auth/api';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

type Props = { controller: AdminController };

export function AdminOverlays({ controller }: Props) {
  const {
    editingPromoId,
    editPromoName,
    setEditPromoName,
    editPromoImage,
    setEditPromoImage,
    editPromoArrivee,
    setEditPromoArrivee,
    editPromoDepart,
    setEditPromoDepart,
    editPromoIcal,
    setEditPromoIcal,
    editPromoReferentId,
    setEditPromoReferentId,
    professeurs,
    runAction,
    setEditingPromoId,
    editingProfId,
    editProfPrenom,
    setEditProfPrenom,
    editProfNom,
    setEditProfNom,
    editProfEmail,
    setEditProfEmail,
    setEditingProfId,
    studentsPopupPromoId,
    selectedStudentForPromo,
    setSelectedStudentForPromo,
    users,
    promoStudents,
    selectedDelegueId,
    setSelectedDelegueId,
    setSelectedPromoId,
    handleAssignDelegue,
    setStudentsPopupPromoId,
  } = controller;

  return (
    <>
      {editingPromoId && (
        <section className="rounded-3xl border border-black/10 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">Editer la promotion</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={editPromoName}
              onChange={(e) => setEditPromoName(e.target.value)}
              placeholder="Nom"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={editPromoImage}
              onChange={(e) => setEditPromoImage(e.target.value)}
              placeholder="Image URL"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={editPromoArrivee}
              onChange={(e) => setEditPromoArrivee(e.target.value)}
              placeholder="Annee arrivee"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={editPromoDepart}
              onChange={(e) => setEditPromoDepart(e.target.value)}
              placeholder="Annee depart"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={editPromoIcal}
              onChange={(e) => setEditPromoIcal(e.target.value)}
              placeholder="URL iCal"
              className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
            />
            <select
              value={editPromoReferentId}
              onChange={(e) => setEditPromoReferentId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
            >
              <option value="">Aucun referent</option>
              {professeurs.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.prenom} {prof.nom} - {prof.email}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              className="h-10 rounded-xl bg-zinc-900 text-white"
              onClick={() =>
                void runAction(
                  () =>
                    adminUpdatePromotionRequest(editingPromoId, {
                      nom: editPromoName,
                      image_url: editPromoImage,
                      ical_url: editPromoIcal,
                      annee_arrivee: Number(editPromoArrivee),
                      annee_depart: Number(editPromoDepart),
                      referent_prof_id: editPromoReferentId || undefined,
                    }),
                  'Promotion modifiee.'
                )
              }
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setEditingPromoId('')}
            >
              Fermer
            </Button>
          </div>
        </section>
      )}

      {editingProfId && (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-900">Editer le professeur</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={editProfPrenom}
                onChange={(e) => setEditProfPrenom(e.target.value)}
                placeholder="Prenom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={editProfNom}
                onChange={(e) => setEditProfNom(e.target.value)}
                placeholder="Nom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={editProfEmail}
                onChange={(e) => setEditProfEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className="h-10 rounded-xl bg-zinc-900 text-white"
                onClick={() =>
                  void runAction(
                    () =>
                      adminUpdateProfesseurRequest(editingProfId, {
                        prenom: editProfPrenom,
                        nom: editProfNom,
                        email: editProfEmail,
                      }),
                    'Professeur modifie.'
                  )
                }
              >
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setEditingProfId('')}
              >
                Fermer
              </Button>
            </div>
          </div>
        </section>
      )}

      {studentsPopupPromoId && (
        <section className="rounded-3xl border border-black/10 bg-white p-6">
          <h3 className="text-lg font-semibold text-zinc-900">
            Gestion des eleves de la promotion
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              value={selectedStudentForPromo}
              onChange={(e) => setSelectedStudentForPromo(e.target.value)}
              className="h-11 rounded-xl border border-zinc-300 px-3"
            >
              <option value="">Selectionner un eleve</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.prenom} {user.nom}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                type="button"
                className="h-10 rounded-xl bg-zinc-900 text-white"
                onClick={() => {
                  if (
                    selectedStudentForPromo &&
                    window.confirm('Ajouter cet eleve a la promotion ?')
                  ) {
                    void runAction(
                      () =>
                        adminAddStudentToPromotionRequest(
                          studentsPopupPromoId,
                          selectedStudentForPromo
                        ),
                      'Eleve ajoute.'
                    );
                  }
                }}
              >
                Ajouter
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  if (
                    selectedStudentForPromo &&
                    window.confirm('Retirer cet eleve de la promotion ?')
                  ) {
                    void runAction(
                      () =>
                        adminRemoveStudentFromPromotionRequest(
                          studentsPopupPromoId,
                          selectedStudentForPromo
                        ),
                      'Eleve retire.'
                    );
                  }
                }}
              >
                Retirer
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-zinc-700">Eleves actuellement dans la promo:</p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {promoStudents.map((student) => (
                <li key={student.id}>
                  {student.prenom} {student.nom} ({student.numero_etudiant ?? 'sans numero'})
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex gap-2">
            <select
              value={selectedDelegueId}
              onChange={(e) => setSelectedDelegueId(e.target.value)}
              className="h-10 rounded-xl border border-zinc-300 px-3"
            >
              <option value="">Delegue</option>
              {promoStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.prenom} {student.nom}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="h-10 rounded-xl bg-zinc-900 text-white"
              onClick={() => {
                setSelectedPromoId(studentsPopupPromoId);
                void handleAssignDelegue(false);
              }}
            >
              Assigner delegue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => {
                setSelectedPromoId(studentsPopupPromoId);
                void handleAssignDelegue(true);
              }}
            >
              Retirer delegue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setStudentsPopupPromoId('')}
            >
              Fermer
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
