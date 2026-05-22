import { useMemo, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import { getResourceFileUrl, type PromotionDashboardPayload } from '@/services/api';

type SubjectsLibraryTabProps = {
  dashboard: PromotionDashboardPayload | null;
};

type SubjectActivity = {
  code: string;
  nom: string;
  semestre: number | null;
  referentNom: string;
  referentEmail: string;
  resources: PromotionDashboardPayload['matieres'][number]['resources'];
  latestResourceAt: number;
};

function formatDate(ts: number): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('fr-FR');
}

export function SubjectsLibraryTab({ dashboard }: SubjectsLibraryTabProps) {
  const [query, setQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'with' | 'without'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent');

  const subjects = useMemo<SubjectActivity[]>(() => {
    return (dashboard?.matieres ?? []).map((matiere) => {
      const latestResourceAt = (matiere.resources ?? []).reduce((maxTs, resource) => {
        const currentTs = new Date(resource.created_at).getTime();
        return currentTs > maxTs ? currentTs : maxTs;
      }, 0);

      return {
        code: matiere.code_matiere,
        nom: matiere.nom_matiere,
        semestre: matiere.ue_semestre,
        referentNom: [matiere.referent_prof_prenom, matiere.referent_prof_nom]
          .filter(Boolean)
          .join(' '),
        referentEmail: matiere.referent_prof_email ?? '',
        resources: matiere.resources ?? [],
        latestResourceAt,
      };
    });
  }, [dashboard?.matieres]);

  const semesters = useMemo(() => {
    return Array.from(
      new Set(subjects.map((item) => item.semestre).filter((item): item is number => item !== null))
    ).sort((a, b) => a - b);
  }, [subjects]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedSemester = semesterFilter === 'all' ? null : Number(semesterFilter);

    const items = subjects.filter((item) => {
      if (selectedSemester !== null && item.semestre !== selectedSemester) return false;
      if (resourceFilter === 'with' && item.resources.length === 0) return false;
      if (resourceFilter === 'without' && item.resources.length > 0) return false;

      if (!normalizedQuery) return true;
      const haystack =
        `${item.nom} ${item.code} ${item.referentNom} ${item.referentEmail}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (sortBy === 'recent') {
      return items.sort((a, b) => {
        if (b.latestResourceAt !== a.latestResourceAt)
          return b.latestResourceAt - a.latestResourceAt;
        return a.nom.localeCompare(b.nom, 'fr');
      });
    }

    return items.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [subjects, query, semesterFilter, resourceFilter, sortBy]);

  const groups = useMemo(() => {
    const map = new Map<string, SubjectActivity[]>();

    for (const item of filtered) {
      const key = item.semestre === null ? 'Sans semestre' : `Semestre ${item.semestre}`;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }

    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 'Sans semestre') return 1;
      if (b[0] === 'Sans semestre') return -1;
      const aSem = Number(a[0].replace('Semestre ', ''));
      const bSem = Number(b[0].replace('Semestre ', ''));
      return aSem - bSem;
    });
  }, [filtered]);

  return (
    <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4">
      <header className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
        <h2 className="text-xl font-semibold text-foreground">Matieres de la promotion</h2>
      </header>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <label className="lg:col-span-2">
          <span className="sr-only">Rechercher une matiere</span>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher (nom, code, referent)"
              className="h-full w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </label>

        <select
          value={semesterFilter}
          onChange={(event) => setSemesterFilter(event.target.value)}
          className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-sm text-foreground"
        >
          <option value="all">Tous les semestres</option>
          {semesters.map((semester) => (
            <option key={semester} value={String(semester)}>
              Semestre {semester}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={resourceFilter}
            onChange={(event) =>
              setResourceFilter(event.target.value as 'all' | 'with' | 'without')
            }
            className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 text-sm text-foreground"
          >
            <option value="all">Tous</option>
            <option value="with">Avec fichier</option>
            <option value="without">Sans fichier</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'recent' | 'alpha')}
            className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 text-sm text-foreground"
          >
            <option value="recent">Plus recents</option>
            <option value="alpha">A - Z</option>
          </select>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">{filtered.length} matiere(s)</div>

      <div className="mt-3 space-y-4">
        {groups.map(([label, items]) => (
          <section
            key={label}
            className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
          >
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <div className="mt-2 space-y-2">
              {items.map((matiere) => (
                <article
                  key={matiere.code}
                  className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {matiere.nom}{' '}
                        <span className="text-muted-foreground">({matiere.code})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Derniere activite fichier: {formatDate(matiere.latestResourceAt)}
                      </p>
                    </div>
                    <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-xs text-muted-foreground">
                      {matiere.resources.length} fichier(s)
                    </span>
                  </div>

                  {(matiere.referentNom || matiere.referentEmail) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Referent: {matiere.referentNom || '-'}{' '}
                      {matiere.referentEmail ? `- ${matiere.referentEmail}` : ''}
                    </p>
                  )}

                  <div className="mt-2 space-y-1">
                    {matiere.resources.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucun fichier.</p>
                    ) : (
                      matiere.resources.map((resource) => (
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
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 text-sm text-muted-foreground">
          Aucune matiere ne correspond aux filtres.
        </div>
      )}
    </section>
  );
}
