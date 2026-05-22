export function PrivacyPage() {
  return (
    <main className="min-h-[60vh] bg-[var(--surface-1)] px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-6">
        <h1 className="text-2xl font-semibold">Politique de protection des donnees</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Let-Note traite des donnees personnelles necessaires au fonctionnement du service
          (identite, roles, promotions, notes, ressources pedagogiques).
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Les donnees sont utilisees uniquement pour les fonctionnalites pedagogiques.</li>
          <li>L'acces est limite selon les roles (eleve, delegue, admin).</li>
          <li>Les donnees ne sont pas revendues a des tiers.</li>
          <li>Vous pouvez demander une correction ou suppression des donnees inexactes.</li>
        </ul>
      </section>
    </main>
  );
}
