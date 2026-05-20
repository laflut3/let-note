import type { PromotionDashboardPayload } from '@/services/api';

type SubjectsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function SubjectsModule({ dashboard }: SubjectsModuleProps) {
  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-4">
      <h3 className="text-sm font-semibold">Liste des matieres</h3>
      <div className="mt-2 space-y-2">
        {(dashboard?.matieres ?? []).map((matiere) => (
          <details
            key={matiere.code_matiere}
            className="rounded-lg border border-zinc-300 p-2"
            open
          >
            <summary className="cursor-pointer text-sm font-semibold">
              {matiere.nom_matiere}
            </summary>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                {(['cours', 'td', 'tp'] as const).map((type) => {
                  const resources = (matiere.resources ?? []).filter(
                    (item) => item.type_metier === type
                  );
                  return (
                    <div key={`${matiere.code_matiere}-${type}`}>
                      <p className="text-xs font-semibold uppercase text-zinc-600">{type}</p>
                      <div className="mt-1 space-y-1">
                        {resources.length === 0 ? (
                          <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                            fichier lier au {type}
                          </button>
                        ) : (
                          resources.map((resource) => (
                            <a
                              key={resource.id}
                              href={resource.url ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-center text-xs"
                            >
                              {resource.title}
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-600">exam</p>
                <div className="space-y-1">
                  {(matiere.resources ?? [])
                    .filter((item) => item.type_metier === 'exam')
                    .map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-center text-xs"
                      >
                        {resource.title}
                      </a>
                    ))}
                  {(matiere.resources ?? []).filter((item) => item.type_metier === 'exam')
                    .length === 0 ? (
                    <>
                      <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                        fichier lier au l'exam
                      </button>
                      <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                        fichier lier au anal
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 p-2 text-xs">
                  info sur le prof referent au cour
                  <br />
                  {matiere.referent_prof_prenom ?? '-'} {matiere.referent_prof_nom ?? ''}
                  <br />
                  {matiere.referent_prof_email ?? '-'}
                </div>
              </div>
            </div>
            <div className="mt-2 rounded-md border border-zinc-300 bg-zinc-50 p-2 text-xs">
              referent: {matiere.referent_prof_prenom ?? '-'} {matiere.referent_prof_nom ?? ''}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
