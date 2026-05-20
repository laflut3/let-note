import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  logoutRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/features/auth/api';

export type DashboardTab = 'accueil' | 'edt' | 'notes';

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function useDashboardController(navigate: NavigateFunction) {
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('accueil');
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = roles.includes('admin');
  const hasDelegueScope = promotions.some((promotion) => promotion.can_manage);

  const selectedPromotion =
    promotions.find((promotion) => promotion.id === selectedPromoId) ?? null;

  const loadBaseData = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const meResponse = await authMeRequest();
      if (!meResponse.ok) {
        navigate('/', { replace: true });
        return;
      }

      const meData = (await meResponse.json()) as AuthMePayload;
      setRoles(Array.isArray(meData.roles) ? meData.roles : []);

      const promotionsResponse = await listAccessiblePromotionsRequest();
      if (!promotionsResponse.ok) {
        setErrorMessage(
          await extractError(promotionsResponse, 'Impossible de charger les promotions.')
        );
        setPromotions([]);
        return;
      }

      const promotionsData = (await promotionsResponse.json()) as PromotionScope[];
      setPromotions(promotionsData);
      setSelectedPromoId((prev) => prev || promotionsData[0]?.id || '');
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async (promoId: string) => {
    if (!promoId) {
      setDashboard(null);
      return;
    }

    setIsLoadingDashboard(true);
    setErrorMessage('');

    try {
      const response = await getPromotionDashboardRequest(promoId);
      if (!response.ok) {
        setErrorMessage(await extractError(response, 'Impossible de charger cette promotion.'));
        setDashboard(null);
        return;
      }

      const data = (await response.json()) as PromotionDashboardPayload;
      setDashboard(data);
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setDashboard(null);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedPromoId) {
      void loadDashboard(selectedPromoId);
    }
  }, [selectedPromoId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } finally {
      navigate('/', { replace: true });
      setIsLoggingOut(false);
    }
  };

  const promoLabel = useMemo(() => {
    if (!selectedPromotion) {
      return 'Aucune promotion';
    }

    return `${selectedPromotion.nom} (${selectedPromotion.annee_arrivee}-${selectedPromotion.annee_depart})`;
  }, [selectedPromotion]);

  return {
    roles,
    activeTab,
    setActiveTab,
    promotions,
    selectedPromoId,
    setSelectedPromoId,
    dashboard,
    isLoading,
    isLoadingDashboard,
    errorMessage,
    isLoggingOut,
    isAdmin,
    hasDelegueScope,
    handleLogout,
    promoLabel,
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
