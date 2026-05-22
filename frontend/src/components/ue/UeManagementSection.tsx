import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import {
  attachUeToPromotionRequest,
  detachUeFromPromotionRequest,
  listUePromotionsRequest,
  type UeItem,
  type UePromotionLink,
} from '@/services/api';

type Feedback = { type: '' | 'success' | 'error'; message: string };

type UeManagementTheme = {
  panel: string;
  title: string;
  input: string;
  select: string;
  primaryButton: string;
  row: string;
  modalOverlay: string;
  modal: string;
};

type Props = {
  title?: string;
  ueItems: UeItem[];
  newUeNom: string;
  setNewUeNom: (value: string) => void;
  newUeSemestre: string;
  setNewUeSemestre: (value: string) => void;
  editUeId: string;
  setEditUeId: (value: string) => void;
  editUeNom: string;
  setEditUeNom: (value: string) => void;
  editUeSemestre: string;
  setEditUeSemestre: (value: string) => void;
  onCreate: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onDelete: (ueId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onFeedback: (feedback: Feedback) => void;
  theme: UeManagementTheme;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function UeManagementSection({
  title = 'Gestion des UE',
  ueItems,
  newUeNom,
  setNewUeNom,
  newUeSemestre,
  setNewUeSemestre,
  editUeId,
  setEditUeId,
  editUeNom,
  setEditUeNom,
  editUeSemestre,
  setEditUeSemestre,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onFeedback,
  theme,
}: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [attachTarget, setAttachTarget] = useState<UeItem | null>(null);
  const [promotionLinks, setPromotionLinks] = useState<UePromotionLink[]>([]);
  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  const filteredUes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const semesterValue = semesterFilter === 'all' ? null : Number(semesterFilter);

    const filtered = ueItems.filter((ue) => {
      const bySearch =
        !query ||
        ue.nom_ue.toLowerCase().includes(query) ||
        ue.id.toLowerCase().includes(query) ||
        String(ue.semestre).includes(query);
      const bySemester = semesterValue === null || ue.semestre === semesterValue;
      return bySearch && bySemester;
    });

    return filtered.sort((a, b) => {
      if (a.semestre !== b.semestre) {
        return sort === 'asc' ? a.semestre - b.semestre : b.semestre - a.semestre;
      }
      const cmp = a.nom_ue.localeCompare(b.nom_ue, 'fr');
      return sort === 'asc' ? cmp : -cmp;
    });
  }, [ueItems, search, sort, semesterFilter]);

  const availableSemesters = useMemo(
    () => Array.from(new Set(ueItems.map((ue) => ue.semestre))).sort((a, b) => a - b),
    [ueItems]
  );

  const loadPromotionLinks = async (ueId: string) => {
    setIsLoadingLinks(true);
    const response = await listUePromotionsRequest(ueId);
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de charger les affectations UE.'),
      });
      setPromotionLinks([]);
      setIsLoadingLinks(false);
      return;
    }
    const links = (await response.json()) as UePromotionLink[];
    setPromotionLinks(links);
    setSelectedPromotionIds([]);
    setIsLoadingLinks(false);
  };

  const openAttachPopup = async (ue: UeItem) => {
    setAttachTarget(ue);
    await loadPromotionLinks(ue.id);
  };

  const togglePromotion = (promoId: string) => {
    setSelectedPromotionIds((current) =>
      current.includes(promoId) ? current.filter((item) => item !== promoId) : [...current, promoId]
    );
  };

  const submitAttach = async () => {
    if (!attachTarget || selectedPromotionIds.length === 0) return;
    for (const promoId of selectedPromotionIds) {
      const response = await attachUeToPromotionRequest(promoId, attachTarget.id);
      if (!response.ok) {
        onFeedback({
          type: 'error',
          message: await extractError(response, 'Impossible de lier UE a une promotion.'),
        });
        return;
      }
    }
    onFeedback({ type: 'success', message: 'UE liee aux promotions selectionnees.' });
    setSelectedPromotionIds([]);
    await loadPromotionLinks(attachTarget.id);
    await onRefresh();
  };

  const detach = async (promoId: string) => {
    if (!attachTarget) return;
    const response = await detachUeFromPromotionRequest(promoId, attachTarget.id);
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de desaffecter cette UE.'),
      });
      return;
    }
    onFeedback({ type: 'success', message: 'UE desaffectee.' });
    await loadPromotionLinks(attachTarget.id);
    await onRefresh();
  };

  const saveEdit = async () => {
    await onUpdate();
    setEditUeId('');
  };

  return (
    <section className={theme.panel}>
      <h2 className={theme.title}>{title}</h2>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
        <input
          value={newUeNom}
          onChange={(e) => setNewUeNom(e.target.value)}
          placeholder="Nom UE"
          className={theme.input}
        />
        <input
          value={newUeSemestre}
          onChange={(e) => setNewUeSemestre(e.target.value)}
          placeholder="Semestre"
          className={theme.input}
        />
        <Button type="button" className={theme.primaryButton} onClick={() => void onCreate()}>
          Creer UE
        </Button>
      </div>

      <ListControls
        className="mt-4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher (nom UE, id, semestre)"
        sortValue={sort}
        onSortChange={setSort}
        resultCount={filteredUes.length}
      />
      <div className="mt-2">
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className={theme.select}
        >
          <option value="all">Tous les semestres</option>
          {availableSemesters.map((semester) => (
            <option key={semester} value={String(semester)}>
              Semestre {semester}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {filteredUes.map((ue) => {
          const isEditing = editUeId === ue.id;
          return (
            <div key={ue.id} className={theme.row}>
              {isEditing ? (
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_140px]">
                  <input
                    value={editUeNom}
                    onChange={(e) => setEditUeNom(e.target.value)}
                    className={theme.input}
                  />
                  <input
                    value={editUeSemestre}
                    onChange={(e) => setEditUeSemestre(e.target.value)}
                    className={theme.input}
                  />
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">{ue.nom_ue}</p>
                  <p className="text-sm text-muted-foreground">Semestre {ue.semestre}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      className={theme.primaryButton}
                      onClick={() => void saveEdit()}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => setEditUeId('')}
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      setEditUeId(ue.id);
                      setEditUeNom(ue.nom_ue);
                      setEditUeSemestre(String(ue.semestre));
                    }}
                  >
                    Modifier
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => void openAttachPopup(ue)}
                >
                  Affecter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/50 dark:text-rose-200 dark:hover:bg-rose-950/30"
                  onClick={() => void onDelete(ue.id)}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          );
        })}
        {filteredUes.length === 0 && <p className="text-sm text-muted-foreground">Aucune UE.</p>}
      </div>

      {attachTarget && (
        <div className={theme.modalOverlay} onMouseDown={() => setAttachTarget(null)}>
          <div className={theme.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Affecter une UE</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {attachTarget.nom_ue} - semestre {attachTarget.semestre}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2 text-foreground"
                onClick={() => setAttachTarget(null)}
              >
                Fermer
              </button>
            </div>

            <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
              {isLoadingLinks ? (
                <p className="text-sm text-muted-foreground">Chargement des affectations...</p>
              ) : (
                promotionLinks.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={promo.linked}
                        checked={promo.linked || selectedPromotionIds.includes(promo.id)}
                        onChange={() => togglePromotion(promo.id)}
                      />
                      <span className="font-medium text-foreground">
                        {promo.nom} ({promo.annee_arrivee}-{promo.annee_depart})
                      </span>
                    </label>
                    {promo.linked ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/50 dark:text-rose-200 dark:hover:bg-rose-950/30"
                        onClick={() => void detach(promo.id)}
                      >
                        Desaffecter
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non liee</span>
                    )}
                  </div>
                ))
              )}
              {!isLoadingLinks && promotionLinks.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune promotion disponible.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setAttachTarget(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className={theme.primaryButton}
                disabled={selectedPromotionIds.length === 0}
                onClick={() => void submitAttach()}
              >
                Affecter aux promotions
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
