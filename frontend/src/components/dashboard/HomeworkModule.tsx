import type { PromotionDashboardPayload } from '@/services/api';

type HomeworkModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

function toDueTimestamp(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T23:59:59`;
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function HomeworkModule({ dashboard }: HomeworkModuleProps) {
  const now = new Date();
  const upcoming = (dashboard?.devoirs ?? [])
    .filter((devoir) => {
      const dueTs = toDueTimestamp(devoir.date_rendu);
      if (dueTs === null) return true;
      return dueTs >= now.getTime();
    })
    .sort((a, b) => {
      const aTs = toDueTimestamp(a.date_rendu) ?? Number.MAX_SAFE_INTEGER;
      const bTs = toDueTimestamp(b.date_rendu) ?? Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });

  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-foreground">Homework</h3>
      <div className="mt-2 space-y-2">
        {upcoming.map((devoir) => (
          <article
            key={devoir.id}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{devoir.titre}</p>
              {devoir.date_rendu && (
                <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-xs text-muted-foreground">
                  {new Date(devoir.date_rendu).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {devoir.nom_matiere} ({devoir.id_mat})
            </p>
            {devoir.description && (
              <p className="mt-2 text-xs text-muted-foreground">{devoir.description}</p>
            )}
          </article>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir en cours.</p>
        )}
      </div>
    </section>
  );
}
