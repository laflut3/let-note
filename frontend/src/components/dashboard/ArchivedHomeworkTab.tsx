import type { PromotionDashboardPayload } from '@/services/api';

type ArchivedHomeworkTabProps = {
  dashboard: PromotionDashboardPayload | null;
};

function toDueTimestamp(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T23:59:59`;
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function ArchivedHomeworkTab({ dashboard }: ArchivedHomeworkTabProps) {
  const now = new Date();
  const archived = (dashboard?.devoirs ?? [])
    .filter((devoir) => {
      const dueTs = toDueTimestamp(devoir.date_rendu);
      if (dueTs === null) return false;
      return dueTs < now.getTime();
    })
    .sort((a, b) => {
      const aTs = toDueTimestamp(a.date_rendu) ?? 0;
      const bTs = toDueTimestamp(b.date_rendu) ?? 0;
      return bTs - aTs;
    });

  return (
    <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4">
      <header className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
        <h2 className="text-xl font-semibold text-foreground">Historique des devoirs</h2>
      </header>

      <div className="mt-4 space-y-2">
        {archived.map((devoir) => (
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
        {archived.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir archive.</p>
        )}
      </div>
    </section>
  );
}
