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
    <aside className="rounded-2xl border border-zinc-300 bg-white p-2">
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
                  ? 'border-zinc-800 bg-[#f6e7a1] text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500',
              ].join(' ')}
            >
              {promotion.image_url ? (
                <img
                  src={promotion.image_url}
                  alt={promotion.nom}
                  className="mx-auto mb-1 h-9 w-9 rounded-md border border-zinc-400 object-cover"
                />
              ) : (
                <div className="mx-auto mb-1 h-9 w-9 rounded-md border border-zinc-400 bg-zinc-100" />
              )}
              {promotion.nom}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
