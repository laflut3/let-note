import type { PromotionScope } from '@/services/api';

type PromotionListSidebarProps = {
  promotions: PromotionScope[];
  selectedPromoId: string;
  onSelectPromo: (id: string) => void;
};

export function PromotionListSidebar({
  promotions,
  selectedPromoId,
  onSelectPromo,
}: PromotionListSidebarProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Promotions</p>
      <div className="space-y-2">
        {promotions.map((promotion) => {
          const active = promotion.id === selectedPromoId;
          return (
            <button
              key={promotion.id}
              type="button"
              onClick={() => onSelectPromo(promotion.id)}
              className={[
                'w-full rounded-xl border px-3 py-2 text-left text-sm transition flex items-center gap-3',
                active
                  ? 'border-[var(--surface-strong)] bg-[var(--surface-strong)] text-white dark:text-zinc-900'
                  : 'border-[var(--surface-border)] bg-[var(--surface-2)] text-foreground hover:border-[var(--surface-strong)]',
              ].join(' ')}
            >
              {promotion.image_url ? (
                <img
                  src={promotion.image_url}
                  alt={promotion.nom}
                  className="h-10 w-10 rounded-md border border-[var(--surface-border)] object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)]" />
              )}
              <div>
                <div className="font-semibold">{promotion.nom}</div>
                <div className="text-xs opacity-80">
                  {promotion.annee_arrivee} - {promotion.annee_depart}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
