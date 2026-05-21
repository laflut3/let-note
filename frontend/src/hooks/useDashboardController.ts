import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  authMeRequest,
  getMyProfileRequest,
  getPromotionIcalRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  logoutRequest,
  uploadMyProfilePhotoRequest,
  updateMyProfileRequest,
  type AuthMePayload,
  type MyProfilePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/services/api';
import {
  getTodayBounds,
  isInRange,
  parseIcsEvents,
  type ScheduleEvent,
} from '@/lib/dashboard/schedule';

export type DashboardTab = 'accueil' | 'edt' | 'notes' | 'profil';

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
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([]);
  const [profile, setProfile] = useState<MyProfilePayload | null>(null);
  const [profileForm, setProfileForm] = useState({
    numero_etudiant: '',
    nom: '',
    prenom: '',
    email: '',
    date_naissance: '',
    photo_url: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

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

  const loadSchedule = async (promoId: string) => {
    if (!promoId) {
      setTodayEvents([]);
      setAllEvents([]);
      setScheduleError('');
      return;
    }

    setIsLoadingSchedule(true);
    setScheduleError('');

    try {
      const response = await getPromotionIcalRequest(promoId);
      if (!response.ok) {
        throw new Error('iCal request failed');
      }

      const rawIcs = await response.text();
      const events = parseIcsEvents(rawIcs);
      const now = new Date();
      const today = getTodayBounds(now);

      setTodayEvents(events.filter((event) => isInRange(event, today.start, today.end)));
      setAllEvents(events);
    } catch {
      setTodayEvents([]);
      setAllEvents([]);
      setScheduleError('Impossible de charger l emploi du temps iCal.');
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await getMyProfileRequest();
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as MyProfilePayload;
      setProfile(data);
      setProfileForm({
        numero_etudiant: data.numero_etudiant ?? '',
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        date_naissance: data.date_naissance,
        photo_url: data.photo_url ?? '',
      });
    } catch {
      // keep dashboard usable
    }
  };

  useEffect(() => {
    void loadBaseData();
    void loadProfile();
  }, []);

  useEffect(() => {
    if (selectedPromoId) {
      void loadDashboard(selectedPromoId);
    }
  }, [selectedPromoId]);

  useEffect(() => {
    void loadSchedule(selectedPromoId);
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

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage('');

    try {
      const response = await updateMyProfileRequest({
        numero_etudiant: profileForm.numero_etudiant,
        nom: profileForm.nom,
        prenom: profileForm.prenom,
        email: profileForm.email,
        date_naissance: profileForm.date_naissance,
      });

      if (!response.ok) {
        setProfileMessage(await extractError(response, 'Impossible de mettre a jour le profil.'));
        return;
      }

      const updated = (await response.json()) as MyProfilePayload;
      setProfile(updated);
      setProfileForm({
        numero_etudiant: updated.numero_etudiant ?? '',
        nom: updated.nom,
        prenom: updated.prenom,
        email: updated.email,
        date_naissance: updated.date_naissance,
        photo_url: updated.photo_url ?? '',
      });
      setProfileMessage('Profil mis a jour.');
    } catch {
      setProfileMessage('Erreur reseau lors de la mise a jour du profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    setIsSavingProfile(true);
    setProfileMessage('');
    try {
      const response = await uploadMyProfilePhotoRequest(file);
      if (!response.ok) {
        setProfileMessage(await extractError(response, 'Impossible d uploader la photo.'));
        return;
      }
      const updated = (await response.json()) as MyProfilePayload;
      setProfile(updated);
      setProfileForm({
        numero_etudiant: updated.numero_etudiant ?? '',
        nom: updated.nom,
        prenom: updated.prenom,
        email: updated.email,
        date_naissance: updated.date_naissance,
        photo_url: updated.photo_url ?? '',
      });
      setProfileMessage('Photo de profil mise a jour.');
    } catch {
      setProfileMessage('Erreur reseau lors de l upload de la photo.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const promoLabel = useMemo(() => {
    if (!selectedPromotion) {
      return 'Aucune promotion';
    }

    return `${selectedPromotion.nom} (${selectedPromotion.annee_arrivee}-${selectedPromotion.annee_depart})`;
  }, [selectedPromotion]);

  const refreshDashboard = async () => {
    if (selectedPromoId) {
      await loadDashboard(selectedPromoId);
    }
  };

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
    isLoadingSchedule,
    scheduleError,
    todayEvents,
    allEvents,
    profile,
    profileForm,
    setProfileForm,
    isSavingProfile,
    profileMessage,
    saveProfile,
    uploadProfilePhoto,
    refreshDashboard,
    isAdmin,
    hasDelegueScope,
    handleLogout,
    promoLabel,
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
