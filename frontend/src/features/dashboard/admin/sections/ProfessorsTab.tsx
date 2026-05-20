import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDeleteProfesseurRequest } from '@/features/auth/api';
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
    professeurs,
    setSelectedProfId,
    setEditProfPrenom,
    setEditProfNom,
    setEditProfEmail,
    setEditingProfId,
    runAction,
  } = controller;

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-4 sm:p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
      <h2 className="text-xl font-semibold text-zinc-900">Gestion des professeurs</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={profPrenom}
          onChange={(e) => setProfPrenom(e.target.value)}
          placeholder="Prenom"
          className="h-11 rounded-xl border border-zinc-300 px-3"
        />
        <input
          value={profNom}
          onChange={(e) => setProfNom(e.target.value)}
          placeholder="Nom"
          className="h-11 rounded-xl border border-zinc-300 px-3"
        />
        <input
          value={profEmail}
          onChange={(e) => setProfEmail(e.target.value)}
          placeholder="Email"
          className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
        />
        <input
          type="date"
          value={profBirthDate}
          onChange={(e) => setProfBirthDate(e.target.value)}
          className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
        />
      </div>
      <Button
        type="button"
        onClick={handleCreateProfessor}
        disabled={isCreatingProf}
        className="mt-4 h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
      >
        {isCreatingProf ? 'Creation...' : 'Creer professeur'}
      </Button>

      <h3 className="mt-6 text-lg font-semibold text-zinc-900">Liste des professeurs</h3>
      <div className="mt-3 space-y-2">
        {professeurs.map((prof) => (
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
                  if (window.confirm('Supprimer ce professeur ?')) {
                    void runAction(
                      () => adminDeleteProfesseurRequest(prof.id),
                      'Professeur supprime.'
                    );
                  }
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
