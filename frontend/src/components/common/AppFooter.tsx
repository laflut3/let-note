import { Link } from 'react-router-dom';
import { Globe, UserRound } from 'lucide-react';
import { APP_ROUTES } from '@/lib/constants/routes';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--surface-border)] bg-[var(--surface-2)]">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Let-Note</p>
          <p className="text-xs text-muted-foreground">@leo torres - createur du projet</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href="https://github.com/laflut3/let-note"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-1.5 text-foreground transition hover:bg-[var(--surface-muted)]"
          >
            <Globe className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/leo-torres-804687264/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-1.5 text-foreground transition hover:bg-[var(--surface-muted)]"
          >
            <UserRound className="h-4 w-4" />
            LinkedIn
          </a>
          <Link
            to={APP_ROUTES.terms}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-1.5 text-foreground transition hover:bg-[var(--surface-muted)]"
          >
            Conditions d'utilisation
          </Link>
          <Link
            to={APP_ROUTES.privacy}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-1.5 text-foreground transition hover:bg-[var(--surface-muted)]"
          >
            Protection des donnees
          </Link>
        </div>
      </div>
    </footer>
  );
}
