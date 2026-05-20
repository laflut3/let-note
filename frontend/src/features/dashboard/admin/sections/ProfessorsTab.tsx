import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDeleteProfesseurRequest } from '@/features/auth/api';
import { adminUi } from '@/features/dashboard/admin/lib/ui';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

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
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          value={profSearch}
          onChange={(e) => setProfSearch(e.target.value)}
          placeholder="Rechercher (nom, prenom, email)"
          className="sm:col-span-2 h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        />
        <select
          value={profSort}
          onChange={(e) => setProfSort(e.target.value as 'asc' | 'desc')}
          className="h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        >
          <option value="asc">Tri: A → Z</option>
          <option value="desc">Tri: Z → A</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-zinc-600">{filteredProfesseurs.length} resultat(s)</p>
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
