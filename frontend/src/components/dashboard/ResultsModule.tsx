import { useEffect, useMemo, useState } from 'react';
import { createResultatRequest, type PromotionDashboardPayload } from '@/services/api';
import { Button } from '@/components/ui/button';

type ResultsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
  promoId: string;
  onSaved: () => Promise<void>;
};

export function ResultsModule({ dashboard, promoId, onSaved }: ResultsModuleProps) {
  const [semester, setSemester] = useState('all');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [libelle, setLibelle] = useState('Note');
  const [session, setSession] = useState('1');
  const [note, setNote] = useState('');
  const [coef, setCoef] = useState('1');
  const [message, setMessage] = useState('');

  const semesters = useMemo(
    () =>
      Array.from(
        new Set(
          (dashboard?.matieres ?? [])
            .map((matiere) => matiere.ue_semestre)
            .filter((value): value is number => value !== null)
        )
      ).sort((a, b) => a - b),
    [dashboard?.matieres]
  );

  const resultGroups = useMemo(() => {
    const selectedSemester = semester === 'all' ? null : Number(semester);
    const resultatsByMatiere = new Map<string, PromotionDashboardPayload['resultats']>();
    for (const resultat of dashboard?.resultats ?? []) {
      const current = resultatsByMatiere.get(resultat.id_mat) ?? [];
      current.push(resultat);
      resultatsByMatiere.set(resultat.id_mat, current);
    }
    const groups = new Map<
      string,
      {
        id: string;
        nom: string;
        semestre: number;
        matieres: Map<string, { nom: string; resultats: PromotionDashboardPayload['resultats'] }>;
      }
    >();

    for (const matiere of dashboard?.matieres ?? []) {
      if (!matiere.ue_id || !matiere.ue_semestre) continue;
      if (selectedSemester !== null && matiere.ue_semestre !== selectedSemester) continue;

      const group = groups.get(matiere.ue_id) ?? {
        id: matiere.ue_id,
        nom: matiere.ue_nom ?? 'UE sans nom',
        semestre: matiere.ue_semestre,
        matieres: new Map(),
      };
      group.matieres.set(matiere.code_matiere, {
        nom: matiere.nom_matiere,
        resultats: resultatsByMatiere.get(matiere.code_matiere) ?? [],
      });
      groups.set(matiere.ue_id, group);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.semestre !== b.semestre) return a.semestre - b.semestre;
      return a.nom.localeCompare(b.nom, 'fr');
    });
  }, [dashboard?.matieres, dashboard?.resultats, semester]);

  const visibleMatieres = useMemo(
    () =>
      resultGroups.flatMap((ue) =>
        Array.from(ue.matieres.entries()).map(([code, matiere]) => ({ code, nom: matiere.nom }))
      ),
    [resultGroups]
  );

  useEffect(() => {
    if (!visibleMatieres.some((matiere) => matiere.code === selectedMatiereId)) {
      setSelectedMatiereId(visibleMatieres[0]?.code ?? '');
    }
  }, [selectedMatiereId, visibleMatieres]);

  const saveResult = async () => {
    if (!promoId || !selectedMatiereId) return;
    setMessage('');
    const response = await createResultatRequest(promoId, selectedMatiereId, {
      libelle,
      session: session ? Number(session) : undefined,
      note: Number(note),
      coef: Number(coef) || 1,
    });
    if (!response.ok) {
      setMessage('Impossible d enregistrer la note.');
      return;
    }
    setNote('');
    setMessage('Note enregistree.');
    await onSaved();
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
      <h2 className="text-lg font-semibold text-zinc-900">Notes et resultats</h2>
      {!dashboard ? (
        <p className="mt-3 text-sm text-zinc-500">Aucun resultat.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
          >
            <option value="all">Tous les semestres</option>
            {semesters.map((item) => (
              <option key={item} value={String(item)}>
                Semestre {item}
              </option>
            ))}
          </select>

          {resultGroups.map((ue) => (
            <section key={ue.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                {ue.nom} - semestre {ue.semestre}
              </h3>
              <div className="mt-3 space-y-3 pl-4">
                {Array.from(ue.matieres.entries()).map(([code, matiere]) => (
                  <div key={code} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMatiereId(code)}
                      className={[
                        'rounded-md px-2 py-1 text-left text-sm font-medium transition',
                        selectedMatiereId === code
                          ? 'bg-[#6d2745] text-white'
                          : 'text-zinc-800 hover:bg-zinc-100',
                      ].join(' ')}
                    >
                      {matiere.nom}
                    </button>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <tbody>
                          {matiere.resultats.map((resultat) => (
                            <tr
                              key={resultat.id}
                              className="border-t border-zinc-100 first:border-t-0"
                            >
                              <td className="px-2 py-2">
                                {resultat.etu_prenom} {resultat.etu_nom}
                              </td>
                              <td className="px-2 py-2">{resultat.libelle}</td>
                              <td className="px-2 py-2">Session {resultat.session ?? '-'}</td>
                              <td className="px-2 py-2 font-semibold">
                                {resultat.note.toFixed(2)}
                              </td>
                              <td className="px-2 py-2">Coef {resultat.coef.toFixed(2)}</td>
                            </tr>
                          ))}
                          {matiere.resultats.length === 0 && (
                            <tr>
                              <td className="px-2 py-2 text-zinc-500">Aucune note.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {resultGroups.length === 0 && (
            <p className="text-sm text-zinc-500">Aucun resultat pour ce semestre.</p>
          )}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input
                value={libelle}
                onChange={(event) => setLibelle(event.target.value)}
                placeholder="Libelle"
                className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
              />
              <input
                value={session}
                onChange={(event) => setSession(event.target.value)}
                placeholder="Session"
                className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
              />
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note"
                className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
              />
              <input
                value={coef}
                onChange={(event) => setCoef(event.target.value)}
                placeholder="Coef"
                className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
              />
              <Button
                type="button"
                disabled={!selectedMatiereId || !note}
                onClick={() => void saveResult()}
                className="h-10 rounded-lg bg-[#6d2745] text-white hover:bg-[#4f1730]"
              >
                Enregistrer
              </Button>
            </div>
            {message && <p className="mt-2 text-sm text-zinc-600">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
