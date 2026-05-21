import type { PromotionDashboardPayload } from '@/services/api';
import { Eye, Download } from 'lucide-react';
import { getResourceFileUrl } from '@/services/api';

type SubjectsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

export function SubjectsModule({ dashboard }: SubjectsModuleProps) {
  const sectionTypes = ['cours', 'td', 'tp', 'exam'] as const;

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
              <div className="space-y-2 lg:col-span-2">
                {sectionTypes.map((type) => {
                  const resources = (matiere.resources ?? []).filter(
                    (item) => item.type_metier === type
                  );
                  return (
                    <div key={`${matiere.code_matiere}-${type}`}>
                      <p className="text-xs font-semibold uppercase text-zinc-600">{type}</p>
                      <div className="mt-1 space-y-1">
                        {resources.length === 0 ? (
                          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                            Pas de fichier [{type.toUpperCase()}]
                          </div>
                        ) : (
                          resources.map((resource) => (
                            <div
                              key={resource.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-zinc-300 bg-[#f3e29a] px-3 py-2 text-xs"
                            >
                              <span className="truncate">{resource.title}</span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={getResourceFileUrl(resource.id, false)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-zinc-500 bg-white/70 px-2 py-1"
                                  title="Visualiser"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Voir
                                </a>
                                <a
                                  href={getResourceFileUrl(resource.id, true)}
                                  className="inline-flex items-center gap-1 rounded-md border border-zinc-500 bg-white/70 px-2 py-1"
                                  title="Telecharger"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Telecharger
                                </a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 p-2 text-xs">
                  info sur le prof referent au cours
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
