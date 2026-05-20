import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminDeleteMatiereRequest, adminUpdateMatiereRequest } from '@/features/auth/api';
import { Modal } from '@/features/dashboard/admin/components/Modal';
import { adminUi } from '@/features/dashboard/admin/lib/ui';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

type Props = { controller: AdminController };

export function SubjectsTab({ controller }: Props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);

  const {
    newMatiereCode,
    setNewMatiereCode,
    newMatiereNom,
    setNewMatiereNom,
    handleCreateMatiere,
    matiereResources,
    resourceType,
    setResourceType,
    resourceTitle,
    setResourceTitle,
    resourceBucket,
    setResourceBucket,
    resourceKey,
    setResourceKey,
    resourceUrl,
    setResourceUrl,
    handleCreateMatiereResource,
    handleDeleteMatiereResource,
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
      <h2 className="text-xl font-semibold text-violet-950">Gestion des matieres</h2>
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

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <input
          value={matiereSearch}
          onChange={(e) => setMatiereSearch(e.target.value)}
          placeholder="Rechercher (nom, code)"
          className="sm:col-span-2 h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        />
        <select
          value={matiereSort}
          onChange={(e) => setMatiereSort(e.target.value as 'asc' | 'desc')}
          className="h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        >
          <option value="asc">Tri: A → Z</option>
          <option value="desc">Tri: Z → A</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-zinc-600">{filteredMatieres.length} resultat(s)</p>

      <div className="mt-4 space-y-3">
        {filteredMatieres.map((matiere) => (
          <article
            key={matiere.code_matiere}
            className={[
              'rounded-xl border p-3 sm:p-4',
              selectedMatiereCode === matiere.code_matiere
                ? 'border-violet-400 bg-violet-50/70'
                : 'border-zinc-200 bg-zinc-50',
            ].join(' ')}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {matiere.nom_matiere} ({matiere.code_matiere})
                </p>
                <p className="text-xs text-zinc-600">{matiere.promotion_count} promotion(s)</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
              disabled={!selectedMatiereCode}
              className="h-10 rounded-xl bg-violet-700 px-4 text-white hover:bg-violet-800"
              onClick={() => void handleCreateMatiereResource()}
            >
              Ajouter fichier metadonnee
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
            value={resourceBucket}
            onChange={(e) => setResourceBucket(e.target.value)}
            placeholder="S3 bucket"
            className={adminUi.input}
          />
          <input
            value={resourceKey}
            onChange={(e) => setResourceKey(e.target.value)}
            placeholder="S3 key (path/fichier.pdf)"
            className={adminUi.input}
          />
          <input
            value={resourceUrl}
            onChange={(e) => setResourceUrl(e.target.value)}
            placeholder="URL (optionnelle)"
            className={`${adminUi.input} sm:col-span-2`}
          />
        </div>

        <div className="mt-4 space-y-2">
          {matiereResources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
