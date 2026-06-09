import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/admin/Modal';
import { Button } from '@/components/ui/button';
import { createDevoirRequest, type PromotionDashboardPayload } from '@/services/api';

type ArchivedHomeworkTabProps = {
  dashboard: PromotionDashboardPayload | null;
  selectedPromoId: string;
  onCreated: () => Promise<void>;
};

function toDueTimestamp(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T23:59:59`;
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function toApiDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function ArchivedHomeworkTab({
  dashboard,
  selectedPromoId,
  onCreated,
}: ArchivedHomeworkTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [idMat, setIdMat] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateRendu, setDateRendu] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const matieres = dashboard?.matieres ?? [];
  const devoirs = useMemo(
    () =>
      [...(dashboard?.devoirs ?? [])].sort((a, b) => {
        const aTs = toDueTimestamp(a.date_rendu) ?? Number.MAX_SAFE_INTEGER;
        const bTs = toDueTimestamp(b.date_rendu) ?? Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      }),
    [dashboard?.devoirs]
  );

  useEffect(() => {
    setIdMat((prev) =>
      matieres.some((matiere) => matiere.code_matiere === prev)
        ? prev
        : (matieres[0]?.code_matiere ?? '')
    );
  }, [matieres]);

  const createDevoir = async () => {
    setFeedback('');
    if (!selectedPromoId || !idMat || !titre.trim()) {
      setFeedback('Matiere et titre requis.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await createDevoirRequest(selectedPromoId, {
        id_mat: idMat,
        titre: titre.trim(),
        description: description.trim() || null,
        date_rendu: toApiDate(dateRendu),
      });
      if (!response.ok) {
        setFeedback(await extractError(response, 'Impossible de creer le devoir.'));
        return;
      }
      setTitre('');
      setDescription('');
      setDateRendu('');
      setIsCreateOpen(false);
      await onCreated();
    } catch {
      setFeedback('Erreur reseau. Reessayez.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
        <h2 className="text-xl font-semibold text-foreground">Devoirs</h2>
        <Button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="h-10 rounded-xl bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
        >
          <Plus className="mr-2 h-4 w-4" />
          Creer
        </Button>
      </header>

      <div className="mt-4 space-y-2">
        {devoirs.map((devoir) => (
          <article
            key={devoir.id}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{devoir.titre}</p>
              <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-xs text-muted-foreground">
                {devoir.date_rendu ? new Date(devoir.date_rendu).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {devoir.nom_matiere} ({devoir.id_mat})
            </p>
            {devoir.description && (
              <p className="mt-2 text-xs text-muted-foreground">{devoir.description}</p>
            )}
          </article>
        ))}
        {devoirs.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir pour cette promotion.</p>
        )}
      </div>

      <Modal
        open={isCreateOpen}
        title="Creer un devoir"
        onClose={() => setIsCreateOpen(false)}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isCreating}
              className="h-10 rounded-xl bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
              onClick={() => void createDevoir()}
            >
              {isCreating ? 'Creation...' : 'Creer'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <select
            value={idMat}
            onChange={(event) => setIdMat(event.target.value)}
            className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
          >
            <option value="">Selectionner matiere</option>
            {matieres.map((matiere) => (
              <option key={matiere.code_matiere} value={matiere.code_matiere}>
                {matiere.nom_matiere} ({matiere.code_matiere})
              </option>
            ))}
          </select>
          <input
            value={titre}
            onChange={(event) => setTitre(event.target.value)}
            placeholder="Titre du devoir"
            className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
          />
          <input
            type="datetime-local"
            value={dateRendu}
            onChange={(event) => setDateRendu(event.target.value)}
            className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="min-h-28 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2 text-foreground"
          />
          {feedback && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200">
              {feedback}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
