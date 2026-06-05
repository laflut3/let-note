import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { APP_ROUTES } from '@/lib/constants/routes';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { AppFooter } from '@/components/common/AppFooter';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ThemeContextProvider } from '@/context/theme-context';
import {
  AdminPage,
  AuthPage,
  DashboardPage,
  DelegatePage,
  PrivacyPage,
  ResetPasswordPage,
  TermsPage,
  VerifyEmailPage,
} from '@/pages';
import { PublicOnlyRoute } from '@/routes/guards/PublicOnlyGuard';
import { ProtectedAdminRoute } from '@/routes/guards/ProtectedAdminGuard';
import { ProtectedDelegueRoute } from '@/routes/guards/ProtectedDelegueGuard';
import { ProtectedDashboardRoute } from '@/routes/guards/ProtectedDashboardGuard';

function AppContent() {
  const { theme, resolvedTheme, toggleTheme } = useThemeMode();
  const location = useLocation();
  const isLoginRoute = location.pathname === APP_ROUTES.root;
  const siteUrl = import.meta.env.VITE_SITE_URL ?? 'https://let-note.app';

  useEffect(() => {
    const normalizedPath = location.pathname || '/';
    const absoluteUrl = new URL(normalizedPath, siteUrl).toString();

    const seoByPath: Record<string, { title: string; description: string; robots?: string }> = {
      [APP_ROUTES.root]: {
        title: 'Let-Note | Plateforme pedagogique',
        description:
          'Let-Note facilite le suivi pedagogique: emploi du temps, notes, devoirs et ressources de cours.',
      },
      [APP_ROUTES.terms]: {
        title: "Conditions d'utilisation | Let-Note",
        description: "Consultez les conditions d'utilisation de la plateforme Let-Note.",
      },
      [APP_ROUTES.privacy]: {
        title: 'Protection des donnees | Let-Note',
        description: 'Consultez la politique de protection des donnees de Let-Note.',
      },
      [APP_ROUTES.verifyEmail]: {
        title: 'Validation email | Let-Note',
        description: 'Validation du compte Let-Note.',
        robots: 'noindex,nofollow',
      },
      [APP_ROUTES.resetPassword]: {
        title: 'Nouveau mot de passe | Let-Note',
        description: 'Reinitialisation du mot de passe Let-Note.',
        robots: 'noindex,nofollow',
      },
      [APP_ROUTES.dashboard]: {
        title: 'Dashboard | Let-Note',
        description: 'Espace personnel Let-Note.',
        robots: 'noindex,nofollow',
      },
      [APP_ROUTES.admin]: {
        title: 'Administration | Let-Note',
        description: 'Espace administration Let-Note.',
        robots: 'noindex,nofollow',
      },
      [APP_ROUTES.delegue]: {
        title: 'Delegue | Let-Note',
        description: 'Espace delegue Let-Note.',
        robots: 'noindex,nofollow',
      },
    };

    const currentSeo = seoByPath[normalizedPath] ?? {
      title: 'Let-Note',
      description:
        'Let-Note facilite le suivi pedagogique: emploi du temps, notes, devoirs et ressources de cours.',
      robots: 'noindex,nofollow',
    };

    document.title = currentSeo.title;

    const setMetaByName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setMetaByProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setCanonical = (url: string) => {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
    };

    setMetaByName('description', currentSeo.description);
    setMetaByName('robots', currentSeo.robots ?? 'index,follow');
    setMetaByProperty('og:title', currentSeo.title);
    setMetaByProperty('og:description', currentSeo.description);
    setMetaByProperty('og:url', absoluteUrl);
    setMetaByName('twitter:title', currentSeo.title);
    setMetaByName('twitter:description', currentSeo.description);
    setCanonical(absoluteUrl);
  }, [location.pathname, siteUrl]);

  return (
    <ThemeContextProvider value={{ theme, resolvedTheme, toggleTheme }}>
      <div className="min-h-screen bg-[var(--surface-1)] text-foreground">
        {isLoginRoute ? (
          <ThemeToggle theme={theme} resolvedTheme={resolvedTheme} onToggle={toggleTheme} />
        ) : null}
        <div className="pb-36">
          <Routes>
            <Route
              path={APP_ROUTES.root}
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path={APP_ROUTES.dashboard}
              element={
                <ProtectedDashboardRoute>
                  <DashboardPage />
                </ProtectedDashboardRoute>
              }
            />
            <Route
              path={APP_ROUTES.admin}
              element={
                <ProtectedAdminRoute>
                  <AdminPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path={APP_ROUTES.delegue}
              element={
                <ProtectedDelegueRoute>
                  <DelegatePage />
                </ProtectedDelegueRoute>
              }
            />
            <Route path={APP_ROUTES.terms} element={<TermsPage />} />
            <Route path={APP_ROUTES.privacy} element={<PrivacyPage />} />
            <Route path={APP_ROUTES.verifyEmail} element={<VerifyEmailPage />} />
            <Route path={APP_ROUTES.resetPassword} element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to={APP_ROUTES.root} replace />} />
          </Routes>
        </div>
        <AppFooter />
      </div>
    </ThemeContextProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
