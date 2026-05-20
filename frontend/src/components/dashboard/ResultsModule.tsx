import type { PromotionDashboardPayload } from '@/services/api';

type ResultsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function ResultsModule({ dashboard }: ResultsModuleProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
      <h2 className="text-lg font-semibold text-zinc-900">Notes et resultats</h2>
      {!dashboard || dashboard.resultats.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Aucun resultat.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left">Matiere</th>
                <th className="px-3 py-2 text-left">Etudiant</th>
                <th className="px-3 py-2 text-left">Libelle</th>
                <th className="px-3 py-2 text-left">Session</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Coef</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.resultats.map((resultat) => (
                <tr key={resultat.id} className="border-t border-zinc-200 bg-white">
                  <td className="px-3 py-2">{resultat.nom_matiere}</td>
                  <td className="px-3 py-2">
                    {resultat.etu_prenom} {resultat.etu_nom}
                  </td>
                  <td className="px-3 py-2">{resultat.libelle}</td>
                  <td className="px-3 py-2">{resultat.session ?? '-'}</td>
                  <td className="px-3 py-2">{resultat.note.toFixed(2)}</td>
                  <td className="px-3 py-2">{resultat.coef.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
