import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import {
  createDevoirRequest,
  deleteDevoirRequest,
  getPromotionDashboardRequest,
  listDevoirsRequest,
  updateDevoirRequest,
  type DevoirItem,
  type PromotionDashboardPayload,
} from '@/services/api';

type Feedback = { type: '' | 'success' | 'error'; message: string };

type Theme = {
  panel: string;
  title: string;
  input: string;
  select: string;
  primaryButton: string;
  row: string;
};

type Props = {
  promotions: Array<{ id: string; nom: string; annee_arrivee: number; annee_depart: number }>;
  matieres: Array<{ code_matiere: string; nom_matiere: string }>;
  selectedPromoId: string;
  onPromoChange: (promoId: string) => void;
  onFeedback: (feedback: Feedback) => void;
  theme: Theme;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

function toLocalDateTimeValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function toApiDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function DevoirsSection({
  promotions,
  matieres,
  selectedPromoId,
  onPromoChange,
  onFeedback,
  theme,
}: Props) {
  const [devoirs, setDevoirs] = useState<DevoirItem[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [idMat, setIdMat] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateRendu, setDateRendu] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingIdMat, setEditingIdMat] = useState('');
  const [editingTitre, setEditingTitre] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDateRendu, setEditingDateRendu] = useState('');
  const [promoMatieres, setPromoMatieres] = useState<
    Array<{ code_matiere: string; nom_matiere: string }>
  >([]);

  const availableMatieres = promoMatieres.length > 0 ? promoMatieres : matieres;

  const loadDevoirs = async () => {
    if (!selectedPromoId) {
      setDevoirs([]);
      return;
    }
    const response = await listDevoirsRequest(selectedPromoId);
    if (!response.ok) {
      setDevoirs([]);
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de charger les devoirs.'),
      });
      return;
    }
    setDevoirs((await response.json()) as DevoirItem[]);
  };

  useEffect(() => {
    void loadDevoirs();
    const loadMatieres = async () => {
      if (!selectedPromoId) {
        setPromoMatieres([]);
        return;
      }
      const response = await getPromotionDashboardRequest(selectedPromoId);
      if (!response.ok) {
        setPromoMatieres([]);
        return;
      }
      const data = (await response.json()) as PromotionDashboardPayload;
      setPromoMatieres(data.matieres);
    };
    void loadMatieres();
  }, [selectedPromoId]);

  useEffect(() => {
    setIdMat((prev) =>
      availableMatieres.some((matiere) => matiere.code_matiere === prev)
        ? prev
        : (availableMatieres[0]?.code_matiere ?? '')
    );
  }, [availableMatieres]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = devoirs.filter((devoir) => {
      if (!query) return true;
      return (
        devoir.titre.toLowerCase().includes(query) ||
        devoir.nom_matiere.toLowerCase().includes(query) ||
        devoir.id_mat.toLowerCase().includes(query)
      );
    });
    return rows.sort((a, b) => {
      const left = a.date_rendu ?? a.created_at;
      const right = b.date_rendu ?? b.created_at;
      return sort === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });
  }, [devoirs, search, sort]);

  const createDevoir = async () => {
    if (!selectedPromoId || !idMat || !titre.trim()) {
      onFeedback({ type: 'error', message: 'Matiere et titre requis.' });
      return;
    }
    const response = await createDevoirRequest(selectedPromoId, {
      id_mat: idMat,
      titre: titre.trim(),
      description: description.trim() || null,
      date_rendu: toApiDate(dateRendu),
    });
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de creer le devoir.'),
      });
      return;
    }
    setTitre('');
    setDescription('');
    setDateRendu('');
    onFeedback({ type: 'success', message: 'Devoir cree.' });
    await loadDevoirs();
  };

  const updateDevoir = async () => {
    if (!selectedPromoId || !editingId || !editingIdMat || !editingTitre.trim()) return;
    const response = await updateDevoirRequest(selectedPromoId, editingId, {
      id_mat: editingIdMat,
      titre: editingTitre.trim(),
      description: editingDescription.trim() || null,
      date_rendu: toApiDate(editingDateRendu),
    });
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de modifier le devoir.'),
      });
      return;
    }
    setEditingId('');
    onFeedback({ type: 'success', message: 'Devoir modifie.' });
    await loadDevoirs();
  };

  const deleteDevoir = async (devoirId: string) => {
    if (!selectedPromoId) return;
    const response = await deleteDevoirRequest(selectedPromoId, devoirId);
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de supprimer le devoir.'),
      });
      return;
    }
    onFeedback({ type: 'success', message: 'Devoir supprime.' });
    await loadDevoirs();
  };

  return (
    <section className={theme.panel}>
      <h2 className={theme.title}>Gestion des devoirs</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <select
          value={selectedPromoId}
          onChange={(e) => onPromoChange(e.target.value)}
          className={theme.select}
        >
          <option value="">Selectionner promotion</option>
          {promotions.map((promotion) => (
            <option key={promotion.id} value={promotion.id}>
              {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
            </option>
          ))}
        </select>
        <select value={idMat} onChange={(e) => setIdMat(e.target.value)} className={theme.select}>
          <option value="">Selectionner matiere</option>
          {availableMatieres.map((matiere) => (
            <option key={matiere.code_matiere} value={matiere.code_matiere}>
              {matiere.nom_matiere} ({matiere.code_matiere})
            </option>
          ))}
        </select>
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre du devoir"
          className={theme.input}
        />
        <input
          type="datetime-local"
          value={dateRendu}
          onChange={(e) => setDateRendu(e.target.value)}
          className={theme.input}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className={`${theme.input} lg:col-span-2`}
        />
        <Button type="button" className={theme.primaryButton} onClick={() => void createDevoir()}>
          Creer devoir
        </Button>
      </div>

      <ListControls
        className="mt-5"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher (titre, matiere, code)"
        sortValue={sort}
        onSortChange={setSort}
        resultCount={filtered.length}
      />

      <div className="mt-4 space-y-3">
        {filtered.map((devoir) => {
          const isEditing = editingId === devoir.id;
          return (
            <article key={devoir.id} className={theme.row}>
              {isEditing ? (
                <div className="grid flex-1 gap-2 lg:grid-cols-2">
                  <select
                    value={editingIdMat}
                    onChange={(e) => setEditingIdMat(e.target.value)}
                    className={theme.select}
                  >
                    {availableMatieres.map((matiere) => (
                      <option key={matiere.code_matiere} value={matiere.code_matiere}>
                        {matiere.nom_matiere} ({matiere.code_matiere})
                      </option>
                    ))}
                  </select>
                  <input
                    value={editingTitre}
                    onChange={(e) => setEditingTitre(e.target.value)}
                    className={theme.input}
                  />
                  <input
                    type="datetime-local"
                    value={editingDateRendu}
                    onChange={(e) => setEditingDateRendu(e.target.value)}
                    className={theme.input}
                  />
                  <input
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className={theme.input}
                  />
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">{devoir.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    {devoir.nom_matiere} ({devoir.id_mat})
                    {devoir.date_rendu
                      ? ` - rendu le ${new Date(devoir.date_rendu).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                  {devoir.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{devoir.description}</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      className={theme.primaryButton}
                      onClick={() => void updateDevoir()}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => setEditingId('')}
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
                      setEditingId(devoir.id);
                      setEditingIdMat(devoir.id_mat);
                      setEditingTitre(devoir.titre);
                      setEditingDescription(devoir.description ?? '');
                      setEditingDateRendu(toLocalDateTimeValue(devoir.date_rendu));
                    }}
                  >
                    Modifier
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/50 dark:text-rose-200 dark:hover:bg-rose-950/30"
                  onClick={() => void deleteDevoir(devoir.id)}
                >
                  Supprimer
                </Button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun devoir.</p>}
      </div>
    </section>
  );
}
