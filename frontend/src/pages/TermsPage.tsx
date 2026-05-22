export function TermsPage() {
  return (
    <main className="min-h-[60vh] bg-[var(--surface-1)] px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-6">
        <h1 className="text-2xl font-semibold">Conditions d'utilisation</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          En utilisant Let-Note, vous acceptez d'utiliser la plateforme uniquement dans un cadre
          pedagogique legitime et de respecter les regles de votre etablissement.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Ne pas tenter d'acceder aux donnees d'autres utilisateurs sans autorisation.</li>
          <li>Ne pas publier de contenu illicite, offensant ou malveillant.</li>
          <li>Conserver la confidentialite de vos identifiants de connexion.</li>
          <li>Signaler tout comportement anormal ou faille de securite constatee.</li>
        </ul>
      </section>
    </main>
  );
}
