import { Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { NumberInput } from '@/components/ui/number-input';
import { adminDeletePromotionRequest, type AdminPromotionSummary } from '@/services/api';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

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
    filteredPromotions,
    openStudentsPopup,
    openEditPromotionPopup,
    runAction,
    openConfirmDialog,
    promotionSearch,
    setPromotionSearch,
    promotionSort,
    setPromotionSort,
  } = controller;

  return (
    <>
      <section className={adminUi.panel}>
        <h2 className="text-xl font-semibold text-foreground">Creer une promotion</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nom, image, annees, prof referent et etudiants.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={promoName}
            onChange={(e) => setPromoName(e.target.value)}
            placeholder="Nom de la promotion"
            className={`${adminUi.input} sm:col-span-2`}
          />
          <NumberInput
            value={anneeArrivee}
            onChange={(e) => setAnneeArrivee(e.target.value)}
            placeholder="Annee d'arrivee"
            step="1"
            className={adminUi.input}
          />
          <NumberInput
            value={anneeDepart}
            onChange={(e) => setAnneeDepart(e.target.value)}
            placeholder="Annee de depart"
            step="1"
            className={adminUi.input}
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className={adminUi.input}
          />
          <input
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            placeholder="URL iCal (optionnel)"
            className={adminUi.input}
          />
          <select
            value={referentProfId}
            onChange={(e) => setReferentProfId(e.target.value)}
            className={`${adminUi.select} sm:col-span-2`}
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
          <p className="text-sm font-medium text-foreground">
            Etudiants ({selectedCount} selectionne{selectedCount > 1 ? 's' : ''})
          </p>
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
            {isLoading ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">Chargement...</p>
            ) : users.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">
                Aucun utilisateur disponible.
              </p>
            ) : (
              users.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-2)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(user.id)}
                      className="h-4 w-4 rounded border-zinc-400"
                    />
                    <span className="text-sm text-foreground">
                      {user.prenom} {user.nom} - {user.email}
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
          className={`mt-5 ${adminUi.primaryBtn}`}
        >
          {isCreatingPromotion ? 'Creation...' : 'Creer la promotion'}
        </Button>
      </section>

      <section className={adminUi.panel}>
        <h2 className="text-xl font-semibold text-foreground">Liste des promotions</h2>
        <ListControls
          className="mt-3"
          searchValue={promotionSearch}
          onSearchChange={setPromotionSearch}
          searchPlaceholder="Rechercher (nom, annee, delegue)"
          sortValue={promotionSort}
          onSortChange={setPromotionSort}
          resultCount={filteredPromotions.length}
        />
        <div className="mt-4 space-y-3">
          {filteredPromotions.map((promotion: AdminPromotionSummary) => (
            <div
              key={promotion.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
            >
              <p className="text-sm text-foreground">
                <span className="font-semibold">{promotion.nom}</span> ({promotion.annee_arrivee}-
                {promotion.annee_depart})
              </p>
              <p className="text-xs text-muted-foreground">
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
                    openConfirmDialog({
                      title: 'Supprimer la promotion',
                      description: `Confirmer la suppression de ${promotion.nom} ?`,
                      confirmLabel: 'Supprimer',
                      isDanger: true,
                      onConfirm: () => {
                        void runAction(
                          () => adminDeletePromotionRequest(promotion.id),
                          'Promotion supprimee.'
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
    </>
  );
}
