import type { PromotionDashboardPayload } from '@/services/api';

type HomeworkModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function HomeworkModule({ dashboard }: HomeworkModuleProps) {
  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-foreground">Homework</h3>
      <div className="mt-2 space-y-2">
        {(dashboard?.devoirs ?? []).map((devoir) => (
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
        {(dashboard?.devoirs ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun devoir.</p>
        )}
      </div>
    </section>
  );
}
