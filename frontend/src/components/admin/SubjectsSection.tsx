import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminDeleteMatiereRequest, adminUpdateMatiereRequest } from '@/services/api';
import { Modal } from '@/components/admin/Modal';
import { NumberInput } from '@/components/ui/number-input';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

export function SubjectsTab({ controller }: Props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isLinkPromoModalOpen, setIsLinkPromoModalOpen] = useState(false);

  const {
    newMatiereCode,
    setNewMatiereCode,
    newMatiereNom,
    setNewMatiereNom,
    handleCreateMatiere,
    matiereResources,
    promotions,
    professeurs,
    resourceType,
    setResourceType,
    resourceTitle,
    setResourceTitle,
    resourceDescription,
    setResourceDescription,
    resourceFile,
    setResourceFile,
    linkPromoId,
    setLinkPromoId,
    linkUes,
    linkUeId,
    setLinkUeId,
    newLinkUeNom,
    setNewLinkUeNom,
    newLinkUeSemestre,
    setNewLinkUeSemestre,
    editLinkUeId,
    setEditLinkUeId,
    editLinkUeNom,
    setEditLinkUeNom,
    editLinkUeSemestre,
    setEditLinkUeSemestre,
    linkReferentProfId,
    setLinkReferentProfId,
    linkCoef,
    setLinkCoef,
    handleCreateMatiereResource,
    handleDeleteMatiereResource,
    handleLinkMatiereToPromotion,
    handleCreateUeForLinkPromo,
    handleUpdateUeForLinkPromo,
    handleDeleteUeForLinkPromo,
    selectedMatiereCode,
    setSelectedMatiereCode,
    filteredMatieres,
    editMatiereNom,
    setEditMatiereNom,
    runAction,
    openConfirmDialog,
    matiereSearch,
    setMatiereSearch,
    matiereSort,
    setMatiereSort,
  } = controller;

  return (
    <section className={adminUi.panel}>
      <h2 className="text-xl font-semibold text-foreground">Gestion des matieres</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={newMatiereCode}
          onChange={(e) => setNewMatiereCode(e.target.value)}
          placeholder="Code matiere (ex: RUST101)"
          className={adminUi.input}
        />
        <input
          value={newMatiereNom}
          onChange={(e) => setNewMatiereNom(e.target.value)}
          placeholder="Nom matiere"
          className={adminUi.input}
        />
      </div>
      <div className="mt-3">
        <Button
          type="button"
          onClick={() => void handleCreateMatiere()}
          className={adminUi.primaryBtn}
        >
          Creer la matiere
        </Button>
      </div>

      <ListControls
        className="mt-6"
        searchValue={matiereSearch}
        onSearchChange={setMatiereSearch}
        searchPlaceholder="Rechercher (nom, code)"
        sortValue={matiereSort}
        onSortChange={setMatiereSort}
        resultCount={filteredMatieres.length}
      />

      <div className="mt-4 space-y-3">
        {filteredMatieres.map((matiere) => (
          <article
            key={matiere.code_matiere}
            className={[
              'rounded-xl border p-3 sm:p-4',
              selectedMatiereCode === matiere.code_matiere
                ? 'border-[var(--surface-strong)] bg-[var(--surface-muted)]'
                : 'border-[var(--surface-border)] bg-[var(--surface-muted)]',
            ].join(' ')}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {matiere.nom_matiere} ({matiere.code_matiere})
                </p>
                <p className="text-xs text-muted-foreground">
                  {matiere.promotion_count} promotion(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => {
                    setSelectedMatiereCode(matiere.code_matiere);
                    setIsLinkPromoModalOpen(true);
                  }}
                >
                  Lier promo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => {
                    setSelectedMatiereCode(matiere.code_matiere);
                    setEditMatiereNom(matiere.nom_matiere);
                    setIsEditModalOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => {
                    setSelectedMatiereCode(matiere.code_matiere);
                    setIsResourceModalOpen(true);
                  }}
                >
                  Ajouter fichier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    openConfirmDialog({
                      title: 'Supprimer la matiere',
                      description: `Confirmer la suppression de ${matiere.nom_matiere} (${matiere.code_matiere}) ?`,
                      confirmLabel: 'Supprimer',
                      isDanger: true,
                      onConfirm: () => {
                        void runAction(
                          () => adminDeleteMatiereRequest(matiere.code_matiere),
                          'Matiere supprimee.'
                        );
                      },
                    });
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={isEditModalOpen}
        title={`Modifier la matiere ${selectedMatiereCode || ''}`}
        onClose={() => setIsEditModalOpen(false)}
        maxWidthClass="max-w-xl"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsEditModalOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              className={adminUi.primaryBtn}
              disabled={!selectedMatiereCode}
              onClick={() =>
                void runAction(
                  () =>
                    adminUpdateMatiereRequest(selectedMatiereCode, { nom_matiere: editMatiereNom }),
                  'Matiere modifiee.'
                )
              }
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <input
          value={editMatiereNom}
          onChange={(e) => setEditMatiereNom(e.target.value)}
          placeholder="Nouveau nom de la matiere"
          className={adminUi.input}
        />
      </Modal>

      <Modal
        open={isLinkPromoModalOpen}
        title={`Lier la matiere ${selectedMatiereCode || ''} a une promotion`}
        onClose={() => setIsLinkPromoModalOpen(false)}
        maxWidthClass="max-w-3xl"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsLinkPromoModalOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              className={adminUi.primaryBtn}
              disabled={!selectedMatiereCode || !linkPromoId || !linkUeId || !linkReferentProfId}
              onClick={() => void handleLinkMatiereToPromotion()}
            >
              Lier la matiere
            </Button>
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={linkPromoId}
            onChange={(e) => setLinkPromoId(e.target.value)}
            className={adminUi.select}
          >
            <option value="">Selectionner promotion</option>
            {promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.nom} ({promo.annee_arrivee}-{promo.annee_depart})
              </option>
            ))}
          </select>
          <select
            value={linkUeId}
            onChange={(e) => setLinkUeId(e.target.value)}
            className={adminUi.select}
          >
            {linkUes.length === 0 && <option value="">Aucune UE disponible</option>}
            {linkUes.map((ue) => (
              <option key={ue.id} value={ue.id}>
                {ue.nom_ue} - semestre {ue.semestre}
              </option>
            ))}
          </select>
          <select
            value={linkReferentProfId}
            onChange={(e) => setLinkReferentProfId(e.target.value)}
            className={adminUi.select}
          >
            <option value="">Selectionner professeur referent</option>
            {professeurs.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.prenom} {prof.nom} - {prof.email}
              </option>
            ))}
          </select>
          <NumberInput
            value={linkCoef}
            onChange={(e) => setLinkCoef(e.target.value)}
            placeholder="Coefficient UE"
            min="0"
            step="0.1"
            className={adminUi.input}
          />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--surface-border)] p-3">
          <p className="text-sm font-semibold text-foreground">Gestion des UE de la promo</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={newLinkUeNom}
              onChange={(e) => setNewLinkUeNom(e.target.value)}
              placeholder="Nom UE"
              className="h-9 w-56 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 text-sm text-foreground"
            />
            <NumberInput
              value={newLinkUeSemestre}
              onChange={(e) => setNewLinkUeSemestre(e.target.value)}
              placeholder="Semestre"
              min="1"
              step="1"
              className="h-9 w-40 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => void handleCreateUeForLinkPromo()}
              disabled={!linkPromoId}
            >
              Ajouter UE
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {linkUes.map((ue) => (
              <div
                key={ue.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] p-2"
              >
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">{ue.nom_ue}</span> - semestre {ue.semestre}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={editLinkUeId === ue.id ? editLinkUeNom : ue.nom_ue}
                    onChange={(e) => {
                      setEditLinkUeId(ue.id);
                      setEditLinkUeNom(e.target.value);
                    }}
                    className="h-9 w-44 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 text-sm text-foreground"
                  />
                  <NumberInput
                    value={editLinkUeId === ue.id ? editLinkUeSemestre : String(ue.semestre)}
                    onChange={(e) => {
                      setEditLinkUeId(ue.id);
                      setEditLinkUeNom(editLinkUeId === ue.id ? editLinkUeNom : ue.nom_ue);
                      setEditLinkUeSemestre(e.target.value);
                    }}
                    min="1"
                    step="1"
                    className="h-9 w-28 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg"
                    onClick={() => {
                      setEditLinkUeId(ue.id);
                      setEditLinkUeNom(editLinkUeId === ue.id ? editLinkUeNom : ue.nom_ue);
                      void handleUpdateUeForLinkPromo();
                    }}
                  >
                    Modifier UE
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => void handleDeleteUeForLinkPromo(ue.id)}
                  >
                    Supprimer UE
                  </Button>
                </div>
              </div>
            ))}
            {linkUes.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune UE pour cette promotion.</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          L’admin peut lier cette matiere a n’importe quelle promo. Le professeur referent doit etre
          rattache a la promo cible.
        </p>
      </Modal>

      <Modal
        open={isResourceModalOpen}
        title={`Ajouter fichier - ${selectedMatiereCode || ''}`}
        onClose={() => setIsResourceModalOpen(false)}
        maxWidthClass="max-w-3xl"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsResourceModalOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              disabled={!selectedMatiereCode || !resourceFile}
              className="h-10 rounded-xl bg-[var(--surface-strong)] px-4 text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
              onClick={() => void handleCreateMatiereResource()}
            >
              Uploader le fichier
            </Button>
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as 'cours' | 'td' | 'tp' | 'exam')}
            className={adminUi.select}
          >
            <option value="cours">cours</option>
            <option value="td">td</option>
            <option value="tp">tp</option>
            <option value="exam">exam</option>
          </select>
          <input
            value={resourceTitle}
            onChange={(e) => setResourceTitle(e.target.value)}
            placeholder="Titre"
            className={adminUi.input}
          />
          <input
            value={resourceDescription}
            onChange={(e) => setResourceDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            className={adminUi.input}
          />
          <input
            type="file"
            className={adminUi.input}
            onChange={(e) => setResourceFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="mt-4 space-y-2">
          {matiereResources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm"
            >
              <p>
                <strong>{resource.type_metier}</strong> - {resource.title} -{' '}
                {resource.url || `${resource.s3_bucket}/${resource.s3_key}`}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg"
                onClick={() => void handleDeleteMatiereResource(resource.id)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}
