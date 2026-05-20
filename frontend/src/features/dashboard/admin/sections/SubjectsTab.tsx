import { Button } from '@/components/ui/button';
import { adminDeleteMatiereRequest, adminUpdateMatiereRequest } from '@/features/auth/api';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

type Props = { controller: AdminController };

export function SubjectsTab({ controller }: Props) {
  const {
    selectedMatiereCode,
    setSelectedMatiereCode,
    matieres,
    editMatiereNom,
    setEditMatiereNom,
    runAction,
  } = controller;

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-4 sm:p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
      <h2 className="text-xl font-semibold text-zinc-900">Gestion des matieres</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          value={selectedMatiereCode}
          onChange={(e) => setSelectedMatiereCode(e.target.value)}
          className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
        >
          <option value="">Selectionner la matiere</option>
          {matieres.map((matiere) => (
            <option key={matiere.code_matiere} value={matiere.code_matiere}>
              {matiere.nom_matiere} ({matiere.code_matiere}) - {matiere.promotion_count} promo(s)
            </option>
          ))}
        </select>
        <input
          value={editMatiereNom}
          onChange={(e) => setEditMatiereNom(e.target.value)}
          placeholder="Nouveau nom"
          className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() =>
            void runAction(
              () => adminUpdateMatiereRequest(selectedMatiereCode, { nom_matiere: editMatiereNom }),
              'Matiere modifiee.'
            )
          }
          disabled={!selectedMatiereCode}
          className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
        >
          Modifier la matiere
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void runAction(
              () => adminDeleteMatiereRequest(selectedMatiereCode),
              'Matiere supprimee.'
            )
          }
          disabled={!selectedMatiereCode}
          className="h-11 rounded-xl"
        >
          Supprimer la matiere
        </Button>
      </div>
    </section>
  );
}
