import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListControls } from '@/components/common/ListControls';
import { adminUi } from '@/lib/admin-ui';
import type { AdminController } from '@/hooks/useAdminController';

type Props = { controller: AdminController };

export function UesSection({ controller }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');

  const {
    promotions,
    uePromoId,
    setUePromoId,
    ueItems,
    newUeSemestre,
    setNewUeSemestre,
    editUeId,
    setEditUeId,
    editUeSemestre,
    setEditUeSemestre,
    ueCatalogItems,
    attachUeId,
    setAttachUeId,
    handleCreateAdminUe,
    handleUpdateAdminUe,
    handleDeleteAdminUe,
    handleAttachAdminUe,
  } = controller;

  const filteredUes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const semesterValue = semesterFilter === 'all' ? null : Number(semesterFilter);

    const filtered = ueItems.filter((ue) => {
      const bySearch =
        !query || ue.id.toLowerCase().includes(query) || String(ue.semestre).includes(query);
      const bySemester = semesterValue === null || ue.semestre === semesterValue;
      return bySearch && bySemester;
    });

    return filtered.sort((a, b) => {
      if (a.semestre !== b.semestre) {
        return sort === 'asc' ? a.semestre - b.semestre : b.semestre - a.semestre;
      }
      const cmp = a.id.localeCompare(b.id);
      return sort === 'asc' ? cmp : -cmp;
    });
  }, [ueItems, search, sort, semesterFilter]);

  const availableSemesters = useMemo(
    () => Array.from(new Set(ueItems.map((ue) => ue.semestre))).sort((a, b) => a - b),
    [ueItems]
  );

  const attachableItems = useMemo(
    () => ueCatalogItems.filter((item) => !item.linked_to_promo),
    [ueCatalogItems]
  );

  return (
    <section className={adminUi.panel}>
      <h2 className="text-xl font-semibold text-violet-950">Gestion des UE</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          value={uePromoId}
          onChange={(e) => setUePromoId(e.target.value)}
          className={adminUi.select}
        >
          <option value="">Selectionner promotion</option>
          {promotions.map((promo) => (
            <option key={promo.id} value={promo.id}>
              {promo.nom} ({promo.annee_arrivee}-{promo.annee_depart})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={newUeSemestre}
            onChange={(e) => setNewUeSemestre(e.target.value)}
            placeholder="Semestre (1-12)"
            className={`${adminUi.input} flex-1`}
          />
          <Button
            type="button"
            className={adminUi.primaryBtn}
            onClick={() => void handleCreateAdminUe()}
          >
            Ajouter UE
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select
          value={attachUeId}
          onChange={(e) => setAttachUeId(e.target.value)}
          className={`${adminUi.select} sm:col-span-2`}
        >
          <option value="">Lier une UE existante</option>
          {attachableItems.map((ue) => (
            <option key={ue.id} value={ue.id}>
              UE {ue.id.slice(0, 8)} - semestre {ue.semestre}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          disabled={!uePromoId || !attachUeId}
          onClick={() => void handleAttachAdminUe()}
        >
          Lier UE existante
        </Button>
      </div>

      <ListControls
        className="mt-4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher (id UE, semestre)"
        sortValue={sort}
        onSortChange={setSort}
        resultCount={filteredUes.length}
      />
      <div className="mt-2">
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm"
        >
          <option value="all">Tous les semestres</option>
          {availableSemesters.map((semester) => (
            <option key={semester} value={String(semester)}>
              Semestre {semester}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {filteredUes.map((ue) => (
          <div
            key={ue.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <p className="text-sm text-zinc-700">
              UE {ue.id.slice(0, 8)} - semestre {ue.semestre}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={editUeId === ue.id ? editUeSemestre : String(ue.semestre)}
                onChange={(e) => {
                  setEditUeId(ue.id);
                  setEditUeSemestre(e.target.value);
                }}
                className="h-9 w-28 rounded-lg border border-zinc-300 px-2 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => {
                  setEditUeId(ue.id);
                  void handleUpdateAdminUe();
                }}
              >
                Modifier
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => void handleDeleteAdminUe(ue.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
        {filteredUes.length === 0 && <p className="text-sm text-zinc-500">Aucune UE.</p>}
      </div>
    </section>
  );
}
