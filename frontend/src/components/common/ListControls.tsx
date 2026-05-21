import type { SortDirection } from '@/types/common';
import { Input } from '@/components/ui/input';

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
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="sm:col-span-2 h-10"
        />
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value as SortDirection)}
          className="h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-sm text-foreground"
        >
          <option value="asc">Tri: A → Z</option>
          <option value="desc">Tri: Z → A</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{resultCount} resultat(s)</p>
    </div>
  );
}
