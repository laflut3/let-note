import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminDeleteProfesseurRequest } from '@/services/api';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

export function ProfessorsTab({ controller }: Props) {
  const {
    profPrenom,
    setProfPrenom,
    profNom,
    setProfNom,
    profEmail,
    setProfEmail,
    profBirthDate,
    setProfBirthDate,
    isCreatingProf,
    handleCreateProfessor,
    filteredProfesseurs,
    setSelectedProfId,
    setEditProfPrenom,
    setEditProfNom,
    setEditProfEmail,
    setEditingProfId,
    runAction,
    openConfirmDialog,
    profSearch,
    setProfSearch,
    profSort,
    setProfSort,
  } = controller;

  return (
    <section className={adminUi.panel}>
      <h2 className="text-xl font-semibold text-violet-950">Gestion des professeurs</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={profPrenom}
          onChange={(e) => setProfPrenom(e.target.value)}
          placeholder="Prenom"
          className={adminUi.input}
        />
        <input
          value={profNom}
          onChange={(e) => setProfNom(e.target.value)}
          placeholder="Nom"
          className={adminUi.input}
        />
        <input
          value={profEmail}
          onChange={(e) => setProfEmail(e.target.value)}
          placeholder="Email"
          className={`${adminUi.input} sm:col-span-2`}
        />
        <input
          type="date"
          value={profBirthDate}
          onChange={(e) => setProfBirthDate(e.target.value)}
          className={`${adminUi.input} sm:col-span-2`}
        />
      </div>
      <Button
        type="button"
        onClick={handleCreateProfessor}
        disabled={isCreatingProf}
        className={`mt-4 ${adminUi.primaryBtn}`}
      >
        {isCreatingProf ? 'Creation...' : 'Creer professeur'}
      </Button>

      <h3 className="mt-6 text-lg font-semibold text-zinc-900">Liste des professeurs</h3>
      <ListControls
        className="mt-3"
        searchValue={profSearch}
        onSearchChange={setProfSearch}
        searchPlaceholder="Rechercher (nom, prenom, email)"
        sortValue={profSort}
        onSortChange={setProfSort}
        resultCount={filteredProfesseurs.length}
      />
      <div className="mt-3 space-y-2">
        {filteredProfesseurs.map((prof) => (
          <div
            key={prof.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3"
          >
            <p className="text-sm text-zinc-800">
              {prof.prenom} {prof.nom} - {prof.email}
            </p>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                onClick={() => {
                  setSelectedProfId(prof.id);
                  setEditProfPrenom(prof.prenom);
                  setEditProfNom(prof.nom);
                  setEditProfEmail(prof.email);
                  setEditingProfId(prof.id);
                }}
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Editer</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                onClick={() => {
                  openConfirmDialog({
                    title: 'Supprimer le professeur',
                    description: `Confirmer la suppression de ${prof.prenom} ${prof.nom} ?`,
                    confirmLabel: 'Supprimer',
                    isDanger: true,
                    onConfirm: () => {
                      void runAction(
                        () => adminDeleteProfesseurRequest(prof.id),
                        'Professeur supprime.'
                      );
                    },
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Supprimer</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
