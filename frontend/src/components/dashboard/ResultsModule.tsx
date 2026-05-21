import { useEffect, useMemo, useState } from 'react';
import {
  createResultatRequest,
  deleteResultatRequest,
  updateResultatRequest,
  type PromotionDashboardPayload,
} from '@/services/api';
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
  const [editingId, setEditingId] = useState('');
  const [editingLibelle, setEditingLibelle] = useState('');
  const [editingSession, setEditingSession] = useState('');
  const [editingNote, setEditingNote] = useState('');
  const [editingCoef, setEditingCoef] = useState('');

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
        matiereCoef: Map<string, number>;
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
        matiereCoef: new Map(),
      };
      group.matieres.set(matiere.code_matiere, {
        nom: matiere.nom_matiere,
        resultats: resultatsByMatiere.get(matiere.code_matiere) ?? [],
      });
      group.matiereCoef.set(matiere.code_matiere, matiere.coef_ue ?? 1);
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

  const computeMatiereAverage = (
    resultats: PromotionDashboardPayload['resultats']
  ): number | null => {
    if (resultats.length === 0) return null;
    const totalCoef = resultats.reduce((acc, item) => acc + (item.coef || 0), 0);
    if (totalCoef <= 0) return null;
    const total = resultats.reduce((acc, item) => acc + item.note * item.coef, 0);
    return total / totalCoef;
  };

  const saveEdit = async (resultatId: string) => {
    if (!promoId) return;
    const response = await updateResultatRequest(promoId, resultatId, {
      libelle: editingLibelle.trim() || undefined,
      session: editingSession.trim() ? Number(editingSession) : undefined,
      note: editingNote.trim() ? Number(editingNote) : undefined,
      coef: editingCoef.trim() ? Number(editingCoef) : undefined,
    });
    if (!response.ok) {
      setMessage('Impossible de modifier la note.');
      return;
    }
    setEditingId('');
    setMessage('Note modifiee.');
    await onSaved();
  };

  const removeResult = async (resultatId: string) => {
    if (!promoId) return;
    const response = await deleteResultatRequest(promoId, resultatId);
    if (!response.ok) {
      setMessage('Impossible de supprimer la note.');
      return;
    }
    setMessage('Note supprimee.');
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
              {(() => {
                const ueParts = Array.from(ue.matieres.entries())
                  .map(([code, matiere]) => {
                    const matAvg = computeMatiereAverage(matiere.resultats);
                    if (matAvg === null) return null;
                    return { avg: matAvg, coef: ue.matiereCoef.get(code) ?? 1 };
                  })
                  .filter((item): item is { avg: number; coef: number } => item !== null);
                const ueCoef = ueParts.reduce((acc, item) => acc + item.coef, 0);
                const ueAvg =
                  ueCoef > 0
                    ? ueParts.reduce((acc, item) => acc + item.avg * item.coef, 0) / ueCoef
                    : null;
                return (
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {ue.nom} - semestre {ue.semestre}{' '}
                    <span className="text-zinc-500">
                      | moyenne UE: {ueAvg === null ? '-' : ueAvg.toFixed(2)}
                    </span>
                  </h3>
                );
              })()}
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
                      {matiere.nom}{' '}
                      <span className="text-xs opacity-80">
                        (moyenne: {computeMatiereAverage(matiere.resultats)?.toFixed(2) ?? '-'})
                      </span>
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
                              <td className="px-2 py-2">
                                {editingId === resultat.id ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <input
                                      value={editingLibelle}
                                      onChange={(event) => setEditingLibelle(event.target.value)}
                                      className="h-8 rounded border border-zinc-300 px-2 text-xs"
                                      placeholder="Libelle"
                                    />
                                    <input
                                      value={editingSession}
                                      onChange={(event) => setEditingSession(event.target.value)}
                                      className="h-8 w-16 rounded border border-zinc-300 px-2 text-xs"
                                      placeholder="S"
                                    />
                                    <input
                                      value={editingNote}
                                      onChange={(event) => setEditingNote(event.target.value)}
                                      className="h-8 w-16 rounded border border-zinc-300 px-2 text-xs"
                                      placeholder="Note"
                                    />
                                    <input
                                      value={editingCoef}
                                      onChange={(event) => setEditingCoef(event.target.value)}
                                      className="h-8 w-16 rounded border border-zinc-300 px-2 text-xs"
                                      placeholder="Coef"
                                    />
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-zinc-900 px-2 text-xs text-white"
                                      onClick={() => void saveEdit(resultat.id)}
                                    >
                                      OK
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded px-2 text-xs"
                                      onClick={() => setEditingId('')}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded px-2 text-xs"
                                      onClick={() => {
                                        setEditingId(resultat.id);
                                        setEditingLibelle(resultat.libelle);
                                        setEditingSession(
                                          resultat.session ? String(resultat.session) : ''
                                        );
                                        setEditingNote(String(resultat.note));
                                        setEditingCoef(String(resultat.coef));
                                      }}
                                    >
                                      Modifier
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 rounded border-rose-300 px-2 text-xs text-rose-700"
                                      onClick={() => void removeResult(resultat.id)}
                                    >
                                      Supprimer
                                    </Button>
                                  </div>
                                )}
                              </td>
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
