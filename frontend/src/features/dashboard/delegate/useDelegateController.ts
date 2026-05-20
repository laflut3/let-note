import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  listUesRequest,
  logoutRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
  type UeItem,
} from '@/features/auth/api';

export type DelegateTab = 'general' | 'matieres' | 'professeurs' | 'resultats';

type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function useDelegateController(navigate: NavigateFunction) {
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DelegateTab>('general');
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [ues, setUes] = useState<UeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const [newUeSemestre, setNewUeSemestre] = useState('1');
  const [matiereCode, setMatiereCode] = useState('');
  const [matiereName, setMatiereName] = useState('');
  const [selectedUeId, setSelectedUeId] = useState('');
  const [matiereCoef, setMatiereCoef] = useState('1');
  const [profNom, setProfNom] = useState('');
  const [profPrenom, setProfPrenom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [referentMatiere, setReferentMatiere] = useState('');
  const [referentProf, setReferentProf] = useState('');

  const [resultMatiereId, setResultMatiereId] = useState('');
  const [resultEtudiantId, setResultEtudiantId] = useState('');
  const [resultLibelle, setResultLibelle] = useState('Session 1');
  const [resultSession, setResultSession] = useState('1');
  const [resultValue, setResultValue] = useState('0');
  const [resultCoef, setResultCoef] = useState('1');

  const isAdmin = roles.includes('admin');

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
      const userRoles = Array.isArray(meData.roles) ? meData.roles : [];
      setRoles(userRoles);

      const promotionsResponse = await listAccessiblePromotionsRequest();
      if (!promotionsResponse.ok) {
        setErrorMessage(
          await extractError(promotionsResponse, 'Impossible de charger les promotions.')
        );
        setPromotions([]);
        return;
      }

      const accessiblePromotions = (await promotionsResponse.json()) as PromotionScope[];
      const manageablePromotions = accessiblePromotions.filter((promotion) => promotion.can_manage);

      setPromotions(manageablePromotions);
      setSelectedPromoId((prev) => prev || manageablePromotions[0]?.id || '');
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromotionData = async (promoId: string) => {
    if (!promoId) {
      setDashboard(null);
      setUes([]);
      return;
    }

    setErrorMessage('');
    try {
      const [dashboardRes, uesRes] = await Promise.all([
        getPromotionDashboardRequest(promoId),
        listUesRequest(promoId),
      ]);

      if (!dashboardRes.ok) {
        setErrorMessage(await extractError(dashboardRes, 'Impossible de charger cette promotion.'));
        setDashboard(null);
        setUes([]);
        return;
      }

      const dashboardData = (await dashboardRes.json()) as PromotionDashboardPayload;
      setDashboard(dashboardData);
      setReferentMatiere(dashboardData.matieres[0]?.code_matiere ?? '');
      setReferentProf(dashboardData.professeurs[0]?.id ?? '');
      setResultMatiereId(dashboardData.matieres[0]?.code_matiere ?? '');
      setResultEtudiantId(dashboardData.etudiants[0]?.id ?? '');

      if (uesRes.ok) {
        const ueData = (await uesRes.json()) as UeItem[];
        setUes(ueData);
        setSelectedUeId((prev) => prev || ueData[0]?.id || '');
      } else {
        setUes([]);
      }
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setDashboard(null);
      setUes([]);
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedPromoId) {
      void loadPromotionData(selectedPromoId);
    }
  }, [selectedPromoId]);

  const runAction = async (action: () => Promise<Response>, successMessage: string) => {
    setFeedback({ type: '', message: '' });

    try {
      const response = await action();
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractError(response, 'Operation impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: successMessage });
      if (selectedPromoId) {
        await loadPromotionData(selectedPromoId);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    }
  };

  const handleLogout = async () => {
    await logoutRequest();
    navigate('/', { replace: true });
  };

  const promoLabel = useMemo(() => {
    const promotion = promotions.find((item) => item.id === selectedPromoId);
    if (!promotion) {
      return 'Aucune promotion deleguee';
    }

    return `${promotion.nom} (${promotion.annee_arrivee}-${promotion.annee_depart})`;
  }, [promotions, selectedPromoId]);

  return {
    roles,
    activeTab,
    setActiveTab,
    promotions,
    selectedPromoId,
    setSelectedPromoId,
    dashboard,
    ues,
    isLoading,
    errorMessage,
    feedback,
    isAdmin,
    newUeSemestre,
    setNewUeSemestre,
    matiereCode,
    setMatiereCode,
    matiereName,
    setMatiereName,
    selectedUeId,
    setSelectedUeId,
    matiereCoef,
    setMatiereCoef,
    profNom,
    setProfNom,
    profPrenom,
    setProfPrenom,
    profEmail,
    setProfEmail,
    referentMatiere,
    setReferentMatiere,
    referentProf,
    setReferentProf,
    resultMatiereId,
    setResultMatiereId,
    resultEtudiantId,
    setResultEtudiantId,
    resultLibelle,
    setResultLibelle,
    resultSession,
    setResultSession,
    resultValue,
    setResultValue,
    resultCoef,
    setResultCoef,
    runAction,
    handleLogout,
    promoLabel,
  };
}

export type DelegateController = ReturnType<typeof useDelegateController>;
