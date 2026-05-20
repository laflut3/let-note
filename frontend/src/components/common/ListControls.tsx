import type { SortDirection } from '@/types/common';

type ListControlsProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: SortDirection;
  onSortChange: (value: SortDirection) => void;
  resultCount: number;
  className?: string;
};

export function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortValue,
  onSortChange,
  resultCount,
  className,
}: ListControlsProps) {
  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="sm:col-span-2 h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        />
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value as SortDirection)}
          className="h-10 rounded-xl border border-violet-200 bg-violet-50/40 px-3"
        >
          <option value="asc">Tri: A → Z</option>
          <option value="desc">Tri: Z → A</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-zinc-600">{resultCount} resultat(s)</p>
    </div>
  );
}
