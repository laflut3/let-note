type PromoHeaderProps = {
  promoLabel: string;
  referentPrenom?: string | null;
  referentNom?: string | null;
};

export function PromoHeader({ promoLabel, referentPrenom, referentNom }: PromoHeaderProps) {
  return (
    <header className="mb-4 rounded-2xl border border-zinc-300 bg-white p-4">
      <h1 className="text-2xl font-semibold text-zinc-900">{promoLabel}</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Prof referent promo:{' '}
        {referentPrenom && referentNom ? `${referentPrenom} ${referentNom}` : 'non defini'}
      </p>
    </header>
  );
}
