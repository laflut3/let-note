import type { PromotionScope } from '@/services/api';

type PromotionPillsProps = {
  promotions: PromotionScope[];
  selectedPromoId: string;
  onSelectPromo: (id: string) => void;
};

export function PromotionPills({
  promotions,
  selectedPromoId,
  onSelectPromo,
}: PromotionPillsProps) {
  return (
    <aside className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-2">
      <div className="space-y-2">
        {promotions.map((promotion) => {
          const active = promotion.id === selectedPromoId;
          return (
            <button
              key={promotion.id}
              type="button"
              onClick={() => onSelectPromo(promotion.id)}
              className={[
                'w-full rounded-xl border p-2 text-center text-[11px] transition',
                active
                  ? 'border-[var(--surface-strong)] bg-[#e2c7b2] text-zinc-900 dark:bg-[#71556b] dark:text-zinc-100'
                  : 'border-[var(--surface-border)] bg-[var(--surface-2)] text-muted-foreground hover:border-[var(--surface-strong)]',
              ].join(' ')}
            >
              {promotion.image_url ? (
                <img
                  src={promotion.image_url}
                  alt={promotion.nom}
                  className="mx-auto mb-1 h-9 w-9 rounded-md border border-[var(--surface-border)] object-cover"
                />
              ) : (
                <div className="mx-auto mb-1 h-9 w-9 rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)]" />
              )}
              {promotion.nom}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
