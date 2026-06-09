import { Button } from '@/components/ui/button';
import { Modal } from '@/components/admin/Modal';
import { adminUi } from '@/lib/admin-ui';
import {
  adminAddStudentToPromotionRequest,
  adminAssignDelegueRequest,
  adminRemoveDelegueRequest,
  adminRemoveStudentFromPromotionRequest,
  adminUpdateProfesseurRequest,
  adminUpdatePromotionRequest,
} from '@/services/api';
import type { AdminController } from '@/hooks/useAdminController';

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
    setStudentsPopupPromoId,
    openConfirmDialog,
    confirmDialog,
    closeConfirmDialog,
    confirmDialogAction,
  } = controller;

  const isSelectedStudentInPromo = promoStudents.some(
    (student) => student.id === selectedStudentForPromo
  );
  const delegueCount = promoStudents.filter((student) => student.is_delegue).length;

  return (
    <>
      <Modal
        open={Boolean(editingPromoId)}
        title="Editer la promotion"
        onClose={() => setEditingPromoId('')}
        actions={
          <>
            <Button
              type="button"
              className={adminUi.primaryBtn}
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
          </>
        }
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={editPromoName}
            onChange={(e) => setEditPromoName(e.target.value)}
            placeholder="Nom"
            className={adminUi.input}
          />
          <input
            value={editPromoImage}
            onChange={(e) => setEditPromoImage(e.target.value)}
            placeholder="Image URL"
            className={adminUi.input}
          />
          <input
            value={editPromoArrivee}
            onChange={(e) => setEditPromoArrivee(e.target.value)}
            placeholder="Annee arrivee"
            className={adminUi.input}
          />
          <input
            value={editPromoDepart}
            onChange={(e) => setEditPromoDepart(e.target.value)}
            placeholder="Annee depart"
            className={adminUi.input}
          />
          <input
            value={editPromoIcal}
            onChange={(e) => setEditPromoIcal(e.target.value)}
            placeholder="URL iCal"
            className={`${adminUi.input} sm:col-span-2`}
          />
          <select
            value={editPromoReferentId}
            onChange={(e) => setEditPromoReferentId(e.target.value)}
            className={`${adminUi.select} sm:col-span-2`}
          >
            <option value="">Aucun referent</option>
            {professeurs.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.prenom} {prof.nom} - {prof.email}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingProfId)}
        title="Editer le professeur"
        onClose={() => setEditingProfId('')}
        actions={
          <>
            <Button
              type="button"
              className={adminUi.primaryBtn}
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
          </>
        }
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={editProfPrenom}
            onChange={(e) => setEditProfPrenom(e.target.value)}
            placeholder="Prenom"
            className={adminUi.input}
          />
          <input
            value={editProfNom}
            onChange={(e) => setEditProfNom(e.target.value)}
            placeholder="Nom"
            className={adminUi.input}
          />
          <input
            value={editProfEmail}
            onChange={(e) => setEditProfEmail(e.target.value)}
            placeholder="Email"
            className={`${adminUi.input} sm:col-span-2`}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(studentsPopupPromoId)}
        title="Gestion des eleves de la promotion"
        onClose={() => setStudentsPopupPromoId('')}
        maxWidthClass="max-w-3xl"
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => setStudentsPopupPromoId('')}
          >
            Fermer
          </Button>
        }
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={selectedStudentForPromo}
            onChange={(e) => setSelectedStudentForPromo(e.target.value)}
            className={adminUi.select}
          >
            <option value="">Selectionner un eleve</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.prenom} {user.nom}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className={adminUi.primaryBtn}
              disabled={!selectedStudentForPromo || isSelectedStudentInPromo}
              onClick={() => {
                if (selectedStudentForPromo) {
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
          </div>
        </div>
        {isSelectedStudentInPromo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cet eleve est deja dans la promotion.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Delegues: {delegueCount}/2 maximum.</p>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Eleves actuellement dans la promo:</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {promoStudents.map((student) => (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2"
              >
                <span>
                  {student.prenom} {student.nom} {student.is_delegue ? '- delegue' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className={adminUi.primaryBtn}
                    disabled={!student.is_delegue && delegueCount >= 2}
                    onClick={() =>
                      void runAction(
                        () =>
                          student.is_delegue
                            ? adminRemoveDelegueRequest(studentsPopupPromoId, student.id)
                            : adminAssignDelegueRequest(studentsPopupPromoId, student.id),
                        student.is_delegue
                          ? 'Delegue retire de la promotion.'
                          : 'Delegue assigne a la promotion.'
                      )
                    }
                  >
                    {student.is_delegue ? 'Retirer delegue' : 'Assigner delegue'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      openConfirmDialog({
                        title: 'Desaffecter eleve',
                        description: `Retirer ${student.prenom} ${student.nom} de cette promotion ?`,
                        confirmLabel: 'Desaffecter',
                        isDanger: true,
                        onConfirm: () => {
                          void runAction(
                            () =>
                              adminRemoveStudentFromPromotionRequest(
                                studentsPopupPromoId,
                                student.id
                              ),
                            'Eleve retire de la promo.'
                          );
                        },
                      });
                    }}
                  >
                    Desaffecter
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <Modal
        open={confirmDialog.open}
        title={confirmDialog.title}
        onClose={closeConfirmDialog}
        maxWidthClass="max-w-lg"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={closeConfirmDialog}
            >
              Fermer
            </Button>
            <Button
              type="button"
              className={[
                'h-10 rounded-xl text-white',
                confirmDialog.isDanger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[var(--surface-strong)] hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900',
              ].join(' ')}
              onClick={confirmDialogAction}
            >
              {confirmDialog.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{confirmDialog.description}</p>
      </Modal>
    </>
  );
}
