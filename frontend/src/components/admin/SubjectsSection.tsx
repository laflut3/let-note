import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminDeleteMatiereRequest, adminUpdateMatiereRequest } from '@/services/api';
import { Modal } from '@/components/admin/Modal';
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
    linkReferentProfId,
    setLinkReferentProfId,
    handleCreateMatiereResource,
    handleDeleteMatiereResource,
    handleLinkMatiereToPromotion,
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
  const selectedMatiere = controller.matieres.find(
    (item) => item.code_matiere === selectedMatiereCode
  );
  const isSelectedPromoAlreadyLinked =
    !!linkPromoId && !!selectedMatiere?.linked_promo_ids.includes(linkPromoId);

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
                {matiere.linked_promotions.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Promotions liees: {matiere.linked_promotions.join(' • ')}
                  </p>
                )}
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
              disabled={
                !selectedMatiereCode ||
                !linkPromoId ||
                !linkReferentProfId ||
                isSelectedPromoAlreadyLinked
              }
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
        </div>
        {selectedMatiere && selectedMatiere.linked_promotions.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
            <p className="text-sm font-semibold text-foreground">
              Promotions deja liees a cette matiere
            </p>
            <div className="mt-2 space-y-2">
              {selectedMatiere.linked_promotions.map((entry, index) => {
                const promoId = selectedMatiere.linked_promo_ids[index];
                return (
                  <div
                    key={`${promoId}-${entry}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">{entry}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                      disabled={!promoId}
                      onClick={() => {
                        if (!promoId) return;
                        openConfirmDialog({
                          title: 'Desaffecter la matiere',
                          description:
                            'Confirmer la desaffectation de cette matiere pour cette promotion ?',
                          confirmLabel: 'Desaffecter',
                          isDanger: true,
                          onConfirm: () => {
                            void controller.handleUnlinkMatiereFromPromotion(promoId);
                          },
                        });
                      }}
                    >
                      Desaffecter
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isSelectedPromoAlreadyLinked && (
          <p className="mt-2 text-xs text-amber-700">
            Cette matiere est deja liee a cette promotion.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Une matiere ne peut etre liee qu une seule fois par promotion. Le professeur referent doit
          etre rattache a la promo cible.
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
