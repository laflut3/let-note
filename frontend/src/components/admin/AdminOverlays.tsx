import { useMemo } from 'react';
import { Search } from 'lucide-react';
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
    editPromoImageFile,
    setEditPromoImageFile,
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
    promoStudentSearch,
    setPromoStudentSearch,
    refreshPromoStudents,
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
  const promoStudentIds = useMemo(
    () => new Set(promoStudents.map((student) => student.id)),
    [promoStudents]
  );
  const filteredUsersForPromo = useMemo(() => {
    const query = promoStudentSearch.trim().toLowerCase();
    const candidates = users.filter((user) => {
      if (!query) return !promoStudentIds.has(user.id);
      const haystack = `${user.prenom} ${user.nom} ${user.email}`.toLowerCase();
      return haystack.includes(query);
    });

    return candidates
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'))
      .slice(0, 20);
  }, [promoStudentIds, promoStudentSearch, users]);

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
                      image_file: editPromoImageFile ?? undefined,
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
          <div className="space-y-2">
            {editPromoImage ? (
              <img
                src={editPromoImage}
                alt=""
                className="h-20 w-full rounded-lg border border-[var(--surface-border)] object-cover"
              />
            ) : null}
            <label className={`${adminUi.input} flex cursor-pointer items-center`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setEditPromoImageFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <span className="truncate">
                {editPromoImageFile ? editPromoImageFile.name : "Remplacer l'image"}
              </span>
            </label>
          </div>
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
        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={promoStudentSearch}
              onChange={(e) => {
                setPromoStudentSearch(e.target.value);
                setSelectedStudentForPromo('');
              }}
              placeholder="Rechercher un eleve par nom, prenom ou email"
              className={`${adminUi.input} pl-9`}
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
            {filteredUsersForPromo.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Aucun eleve disponible pour cette recherche.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredUsersForPromo.map((user) => {
                  const alreadyInPromo = promoStudentIds.has(user.id);
                  return (
                    <li
                      key={user.id}
                      className="flex flex-col gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => setSelectedStudentForPromo(user.id)}
                      >
                        <span className="block truncate text-sm font-medium text-foreground">
                          {user.prenom} {user.nom}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </button>
                      <Button
                        type="button"
                        className={adminUi.primaryBtn}
                        disabled={alreadyInPromo}
                        onClick={() => {
                          void (async () => {
                            const success = await runAction(
                              () =>
                                adminAddStudentToPromotionRequest(studentsPopupPromoId, user.id),
                              'Eleve ajoute.',
                              false
                            );
                            if (success) {
                              setSelectedStudentForPromo('');
                              await refreshPromoStudents(studentsPopupPromoId);
                            }
                          })();
                        }}
                      >
                        {alreadyInPromo ? 'Deja ajoute' : 'Ajouter'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredUsersForPromo.length} resultat{filteredUsersForPromo.length > 1 ? 's' : ''}{' '}
            affiche{filteredUsersForPromo.length > 1 ? 's' : ''}.
          </p>
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
                      void (async () => {
                        const success = await runAction(
                          () =>
                            student.is_delegue
                              ? adminRemoveDelegueRequest(studentsPopupPromoId, student.id)
                              : adminAssignDelegueRequest(studentsPopupPromoId, student.id),
                          student.is_delegue
                            ? 'Delegue retire de la promotion.'
                            : 'Delegue assigne a la promotion.',
                          false
                        );
                        if (success) {
                          await refreshPromoStudents(studentsPopupPromoId);
                        }
                      })()
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
                          void (async () => {
                            const success = await runAction(
                              () =>
                                adminRemoveStudentFromPromotionRequest(
                                  studentsPopupPromoId,
                                  student.id
                                ),
                              'Eleve retire de la promo.',
                              false
                            );
                            if (success) {
                              await refreshPromoStudents(studentsPopupPromoId);
                            }
                          })();
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
