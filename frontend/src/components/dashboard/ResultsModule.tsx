import { useEffect, useMemo, useState } from 'react';
import {
  createResultatRequest,
  deleteResultatRequest,
  updateResultatRequest,
  type PromotionDashboardPayload,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';

type ResultsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
  promoId: string;
  onSaved: () => Promise<void>;
  canManagePromotion: boolean;
  currentUserId: string;
};

export function ResultsModule({
  dashboard,
  promoId,
  onSaved,
  canManagePromotion,
  currentUserId,
}: ResultsModuleProps) {
  const [semester, setSemester] = useState('all');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [createMatiereId, setCreateMatiereId] = useState('');
  const [createMatiereName, setCreateMatiereName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [session, setSession] = useState('');
  const [note, setNote] = useState('');
  const [coef, setCoef] = useState('');
  const [createEtudiantId, setCreateEtudiantId] = useState('');
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

  const canCreateOwnResult = useMemo(
    () =>
      Boolean(currentUserId) &&
      (dashboard?.etudiants ?? []).some((etu) => etu.id === currentUserId),
    [currentUserId, dashboard?.etudiants]
  );

  const canManageResultat = (studentId: string) =>
    canManagePromotion || studentId === currentUserId;
  const canCreateResult = canManagePromotion || canCreateOwnResult;

  const saveResult = async () => {
    if (!promoId || !createMatiereId) return;
    if (canManagePromotion && !createEtudiantId) {
      setMessage('Selectionnez un etudiant de la promotion.');
      return;
    }
    setMessage('');
    const response = await createResultatRequest(promoId, createMatiereId, {
      etudiant_id: canManagePromotion ? createEtudiantId : undefined,
      libelle,
      session: session ? Number(session) : undefined,
      note: Number(note),
      coef: Number(coef) || 1,
    });
    if (!response.ok) {
      setMessage('Impossible d enregistrer la note.');
      return;
    }
    setLibelle('');
    setSession('');
    setNote('');
    setCoef('');
    setCreateEtudiantId('');
    setIsCreateModalOpen(false);
    setMessage('Note enregistree.');
    await onSaved();
  };

  const openCreateModal = (matiereId: string, matiereNom: string) => {
    setCreateMatiereId(matiereId);
    setCreateMatiereName(matiereNom);
    setIsCreateModalOpen(true);
    setLibelle('');
    setSession('');
    setNote('');
    setCoef('');
    setCreateEtudiantId('');
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
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)] sm:p-5">
      <h2 className="text-lg font-semibold text-foreground">Notes et resultats</h2>
      {!dashboard ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucun resultat.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-sm text-foreground"
          >
            <option value="all">Tous les semestres</option>
            {semesters.map((item) => (
              <option key={item} value={String(item)}>
                Semestre {item}
              </option>
            ))}
          </select>

          {resultGroups.map((ue) => (
            <section
              key={ue.id}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
            >
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
                  <h3 className="text-sm font-semibold text-foreground">
                    {ue.nom} - semestre {ue.semestre}{' '}
                    <span className="text-muted-foreground">
                      | moyenne UE: {ueAvg === null ? '-' : ueAvg.toFixed(2)}
                    </span>
                  </h3>
                );
              })()}
              <div className="mt-3 space-y-3">
                {Array.from(ue.matieres.entries()).map(([code, matiere]) => (
                  <div
                    key={code}
                    className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMatiereId(code)}
                        className={[
                          'rounded-md px-2 py-1 text-left text-sm font-medium transition',
                          selectedMatiereId === code
                            ? 'bg-[var(--surface-strong)] text-white dark:text-zinc-900'
                            : 'text-foreground hover:bg-[var(--surface-muted)]',
                        ].join(' ')}
                      >
                        {matiere.nom}{' '}
                        <span className="text-xs opacity-80">
                          (moyenne: {computeMatiereAverage(matiere.resultats)?.toFixed(2) ?? '-'})
                        </span>
                      </button>
                      {canCreateResult && (
                        <Button
                          type="button"
                          onClick={() => openCreateModal(code, matiere.nom)}
                          className="h-8 rounded-lg bg-[var(--surface-strong)] px-3 text-xs text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
                        >
                          Ajouter une note
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 hidden overflow-x-auto md:block">
                      <table className="min-w-full text-sm text-foreground">
                        <tbody>
                          {matiere.resultats.map((resultat) => (
                            <tr
                              key={resultat.id}
                              className="border-t border-[var(--surface-soft-border)] first:border-t-0"
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
                                {!canManageResultat(resultat.id_etu) ? null : editingId ===
                                  resultat.id ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <Input
                                      value={editingLibelle}
                                      onChange={(event) => setEditingLibelle(event.target.value)}
                                      className="h-8 text-xs"
                                      placeholder="Libelle"
                                    />
                                    <NumberInput
                                      value={editingSession}
                                      onChange={(event) => setEditingSession(event.target.value)}
                                      className="h-8 w-16 text-xs"
                                      placeholder="S"
                                      min="1"
                                      step="1"
                                    />
                                    <NumberInput
                                      value={editingNote}
                                      onChange={(event) => setEditingNote(event.target.value)}
                                      className="h-8 w-16 text-xs"
                                      placeholder="Note"
                                      min="0"
                                      max="20"
                                      step="0.01"
                                    />
                                    <NumberInput
                                      value={editingCoef}
                                      onChange={(event) => setEditingCoef(event.target.value)}
                                      className="h-8 w-16 text-xs"
                                      placeholder="Coef"
                                      min="0"
                                      step="0.1"
                                    />
                                    <Button
                                      type="button"
                                      className="h-8 rounded bg-[var(--surface-strong)] px-2 text-xs text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
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
                                      className="h-8 rounded border-rose-400 px-2 text-xs text-rose-700"
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
                              <td className="px-2 py-2 text-muted-foreground">Aucune note.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 space-y-2 md:hidden">
                      {matiere.resultats.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune note.</p>
                      ) : (
                        matiere.resultats.map((resultat) => (
                          <article
                            key={`mobile-${resultat.id}`}
                            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2"
                          >
                            <p className="text-sm font-semibold text-foreground">
                              {resultat.etu_prenom} {resultat.etu_nom}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {resultat.libelle} | Session {resultat.session ?? '-'} | Note{' '}
                              {resultat.note.toFixed(2)} | Coef {resultat.coef.toFixed(2)}
                            </p>
                            {!canManageResultat(resultat.id_etu) ? null : editingId ===
                              resultat.id ? (
                              <div className="mt-2 grid gap-2">
                                <Input
                                  value={editingLibelle}
                                  onChange={(event) => setEditingLibelle(event.target.value)}
                                  className="h-9 text-xs"
                                  placeholder="Libelle"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <NumberInput
                                    value={editingSession}
                                    onChange={(event) => setEditingSession(event.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="S"
                                    min="1"
                                    step="1"
                                  />
                                  <NumberInput
                                    value={editingNote}
                                    onChange={(event) => setEditingNote(event.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Note"
                                    min="0"
                                    max="20"
                                    step="0.01"
                                  />
                                  <NumberInput
                                    value={editingCoef}
                                    onChange={(event) => setEditingCoef(event.target.value)}
                                    className="h-9 text-xs"
                                    placeholder="Coef"
                                    min="0"
                                    step="0.1"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    className="h-8 rounded bg-[var(--surface-strong)] px-2 text-xs text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
                                    onClick={() => void saveEdit(resultat.id)}
                                  >
                                    Enregistrer
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
                              </div>
                            ) : (
                              <div className="mt-2 flex gap-2">
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
                                  className="h-8 rounded border-rose-400 px-2 text-xs text-rose-700"
                                  onClick={() => void removeResult(resultat.id)}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            )}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {resultGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun resultat pour ce semestre.</p>
          )}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      )}

      {canCreateResult && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">Ajouter une note</h3>
            <p className="mt-1 text-sm text-muted-foreground">Matiere: {createMatiereName}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {canManagePromotion && (
                <select
                  value={createEtudiantId}
                  onChange={(event) => setCreateEtudiantId(event.target.value)}
                  className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-sm text-foreground sm:col-span-2"
                >
                  <option value="">Selectionner un etudiant</option>
                  {(dashboard?.etudiants ?? []).map((etu) => (
                    <option key={etu.id} value={etu.id}>
                      {etu.prenom} {etu.nom} ({etu.numero_etudiant ?? 'n/a'})
                    </option>
                  ))}
                </select>
              )}
              <Input
                value={libelle}
                onChange={(event) => setLibelle(event.target.value)}
                placeholder="Libelle"
                className="h-10 text-sm"
              />
              <NumberInput
                value={session}
                onChange={(event) => setSession(event.target.value)}
                placeholder="Session"
                min="1"
                step="1"
                className="h-10 text-sm"
              />
              <NumberInput
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note"
                min="0"
                max="20"
                step="0.01"
                className="h-10 text-sm"
              />
              <NumberInput
                value={coef}
                onChange={(event) => setCoef(event.target.value)}
                placeholder="Coef"
                min="0"
                step="0.1"
                className="h-10 text-sm"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-10 rounded-lg"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={!note || (canManagePromotion && !createEtudiantId)}
                onClick={() => void saveResult()}
                className="h-10 rounded-lg bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
