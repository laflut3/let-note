import { Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDeletePromotionRequest, type AdminPromotionSummary } from '@/features/auth/api';
import type { AdminController } from '@/features/dashboard/admin/useAdminController';

type Props = {
  controller: AdminController;
};

export function PromotionsTab({ controller }: Props) {
  const {
    promoName,
    setPromoName,
    anneeArrivee,
    setAnneeArrivee,
    anneeDepart,
    setAnneeDepart,
    imageUrl,
    setImageUrl,
    icalUrl,
    setIcalUrl,
    referentProfId,
    setReferentProfId,
    professeurs,
    selectedCount,
    isLoading,
    users,
    selectedUserIds,
    toggleUser,
    handleCreatePromotion,
    isCreatingPromotion,
    promotions,
    openStudentsPopup,
    openEditPromotionPopup,
    runAction,
  } = controller;

  return (
    <>
      <section className="rounded-3xl border border-black/10 bg-white/90 p-4 sm:p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
        <h2 className="text-xl font-semibold text-zinc-900">Creer une promotion</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Nom, image, annees, prof referent et etudiants.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={promoName}
            onChange={(e) => setPromoName(e.target.value)}
            placeholder="Nom de la promotion"
            className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
          />
          <input
            value={anneeArrivee}
            onChange={(e) => setAnneeArrivee(e.target.value)}
            placeholder="Annee d'arrivee"
            className="h-11 rounded-xl border border-zinc-300 px-3"
          />
          <input
            value={anneeDepart}
            onChange={(e) => setAnneeDepart(e.target.value)}
            placeholder="Annee de depart"
            className="h-11 rounded-xl border border-zinc-300 px-3"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className="h-11 rounded-xl border border-zinc-300 px-3"
          />
          <input
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="URL iCal (optionnel)"
            className="h-11 rounded-xl border border-zinc-300 px-3"
          />
          <select
            value={referentProfId}
            onChange={(e) => setReferentProfId(e.target.value)}
            className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
          >
            <option value="">Selectionner le professeur referent</option>
            {professeurs.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.prenom} {prof.nom} - {prof.email}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-800">
            Etudiants ({selectedCount} selectionne{selectedCount > 1 ? 's' : ''})
          </p>
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            {isLoading ? (
              <p className="px-2 py-1 text-sm text-zinc-500">Chargement...</p>
            ) : users.length === 0 ? (
              <p className="px-2 py-1 text-sm text-zinc-500">Aucun utilisateur disponible.</p>
            ) : (
              users.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(user.id)}
                      className="h-4 w-4 rounded border-zinc-400"
                    />
                    <span className="text-sm text-zinc-800">
                      {user.prenom} {user.nom} - {user.numero_etudiant ?? 'sans numero'} -{' '}
                      {user.email}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleCreatePromotion}
          disabled={isCreatingPromotion}
          className="mt-5 h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
        >
          {isCreatingPromotion ? 'Creation...' : 'Creer la promotion'}
        </Button>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/90 p-4 sm:p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
        <h2 className="text-xl font-semibold text-zinc-900">Liste des promotions</h2>
        <div className="mt-4 space-y-3">
          {promotions.map((promotion: AdminPromotionSummary) => (
            <div
              key={promotion.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3"
            >
              <p className="text-sm text-zinc-800">
                <span className="font-semibold">{promotion.nom}</span> ({promotion.annee_arrivee}-
                {promotion.annee_depart})
              </p>
              <p className="text-xs text-zinc-600">
                Delegue(s):{' '}
                {promotion.delegues.length > 0 ? promotion.delegues.join(', ') : 'aucun'}
              </p>
              <div className="flex gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                  onClick={() => void openStudentsPopup(promotion.id)}
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Eleves</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                  onClick={() => openEditPromotionPopup(promotion)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Editer</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                  onClick={() => {
                    if (window.confirm('Supprimer cette promotion ?')) {
                      void runAction(
                        () => adminDeletePromotionRequest(promotion.id),
                        'Promotion supprimee.'
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
    </>
  );
}
