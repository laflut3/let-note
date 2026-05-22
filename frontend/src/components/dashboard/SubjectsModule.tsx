import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Eye } from 'lucide-react';
import { getResourceFileUrl, type PromotionDashboardPayload } from '@/services/api';

type SubjectsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
  onOpenAllMatieres: () => void;
};

type SubjectPreview = {
  code: string;
  nom: string;
  semestre: number | null;
  resourcesCount: number;
  latestResourceAt: number;
  referentEmail: string;
};

export function SubjectsModule({ dashboard, onOpenAllMatieres }: SubjectsModuleProps) {
  const [expandedCodes, setExpandedCodes] = useState<string[]>([]);

  const recentSubjects = useMemo<SubjectPreview[]>(() => {
    return (dashboard?.matieres ?? [])
      .map((matiere) => {
        const latestResourceAt = (matiere.resources ?? []).reduce((maxTs, resource) => {
          const currentTs = new Date(resource.created_at).getTime();
          return currentTs > maxTs ? currentTs : maxTs;
        }, 0);

        return {
          code: matiere.code_matiere,
          nom: matiere.nom_matiere,
          semestre: matiere.ue_semestre,
          resourcesCount: (matiere.resources ?? []).length,
          latestResourceAt,
          referentEmail: matiere.referent_prof_email ?? '',
        };
      })
      .sort((a, b) => {
        const aNoFiles = a.resourcesCount === 0;
        const bNoFiles = b.resourcesCount === 0;
        if (aNoFiles !== bNoFiles) return aNoFiles ? 1 : -1;
        if (b.latestResourceAt !== a.latestResourceAt)
          return b.latestResourceAt - a.latestResourceAt;
        return a.nom.localeCompare(b.nom, 'fr');
      })
      .slice(0, 5);
  }, [dashboard?.matieres]);

  const toggleExpanded = (code: string) => {
    setExpandedCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">5 dernieres matieres</h3>
        <button
          type="button"
          onClick={onOpenAllMatieres}
          className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-foreground hover:bg-[var(--surface-muted)]"
        >
          Voir tout
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {recentSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune matiere.</p>
        ) : (
          recentSubjects.map((matiere) => (
            <article
              key={matiere.code}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(matiere.code)}
                  className="inline-flex items-center gap-1 text-left"
                >
                  {expandedCodes.includes(matiere.code) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-semibold text-foreground">
                    {matiere.nom} <span className="text-muted-foreground">({matiere.code})</span>
                  </p>
                </button>
                <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-xs text-muted-foreground">
                  {matiere.semestre ? `S${matiere.semestre}` : 'Sans semestre'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {matiere.resourcesCount} fichier(s)
                {matiere.latestResourceAt
                  ? ` - derniere activite: ${new Date(matiere.latestResourceAt).toLocaleString('fr-FR')}`
                  : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Referent: {matiere.referentEmail || 'email non renseigne'}
              </p>
              {expandedCodes.includes(matiere.code) && (
                <div className="mt-2 space-y-1">
                  {(
                    (dashboard?.matieres ?? []).find((item) => item.code_matiere === matiere.code)
                      ?.resources ?? []
                  )
                    .sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-foreground">{resource.title}</p>
                          <p className="text-muted-foreground">
                            {resource.type_metier.toUpperCase()} -{' '}
                            {new Date(resource.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={getResourceFileUrl(resource.id, false)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </a>
                          <a
                            href={getResourceFileUrl(resource.id, true)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Telecharger
                          </a>
                        </div>
                      </div>
                    ))}
                  {matiere.resourcesCount === 0 && (
                    <p className="text-xs text-muted-foreground">Aucun fichier.</p>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
