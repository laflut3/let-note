import type { PromotionDashboardPayload } from '@/services/api';

type HomeworkModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function HomeworkModule({ dashboard }: HomeworkModuleProps) {
  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-4">
      <h3 className="text-sm font-semibold">Homework</h3>
      <div className="mt-2 space-y-2">
        {(dashboard?.matieres ?? []).slice(0, 3).map((matiere) => (
          <article key={matiere.code_matiere} className="rounded-lg border border-zinc-300 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{matiere.nom_matiere}</p>
              <span className="rounded-md border border-zinc-400 px-2 py-0.5 text-xs">
                date rendu
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">description</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button className="rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                fichier lier au devoir
              </button>
              <button className="rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                fichier lier au devoir
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
