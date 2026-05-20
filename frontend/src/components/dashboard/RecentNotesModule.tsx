import type { PromotionDashboardPayload } from '@/services/api';

type RecentNotesModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function RecentNotesModule({ dashboard }: RecentNotesModuleProps) {
  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-4">
      <h3 className="text-sm font-semibold">5 dernieres notes</h3>
      {dashboard?.resultats?.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {dashboard.resultats.slice(0, 5).map((resultat) => (
            <li key={resultat.id}>
              {resultat.nom_matiere} - {resultat.note.toFixed(2)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Aucune note.</p>
      )}
    </section>
  );
}
