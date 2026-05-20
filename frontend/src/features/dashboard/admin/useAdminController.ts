import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  adminAssignDelegueRequest,
  adminCreateProfesseurRequest,
  adminCreatePromotionRequest,
  adminListPromotionStudentsRequest,
  adminListMatieresRequest,
  adminListProfesseursRequest,
  adminListPromotionsRequest,
  adminListUsersDetailsRequest,
  adminListUsersRequest,
  adminRemoveDelegueRequest,
  logoutRequest,
  type AdminMatiere,
  type AdminProfesseur,
  type AdminPromotionSummary,
  type AdminStudentDetails,
  type AdminUser,
  type PromotionStudent,
} from '@/features/auth/api';

export type AdminTab = 'promotions' | 'etudiants' | 'professeurs' | 'matieres';

export type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function useAdminController(navigate: NavigateFunction) {
  const [activeTab, setActiveTab] = useState<AdminTab>('promotions');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [studentsDetails, setStudentsDetails] = useState<AdminStudentDetails[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState('');
  const [promotions, setPromotions] = useState<AdminPromotionSummary[]>([]);
  const [professeurs, setProfesseurs] = useState<AdminProfesseur[]>([]);
  const [matieres, setMatieres] = useState<AdminMatiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const [promoName, setPromoName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [anneeArrivee, setAnneeArrivee] = useState(String(new Date().getFullYear()));
  const [anneeDepart, setAnneeDepart] = useState(String(new Date().getFullYear() + 3));
  const [referentProfId, setReferentProfId] = useState('');
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);

  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [editPromoName, setEditPromoName] = useState('');
  const [editPromoImage, setEditPromoImage] = useState('');
  const [editPromoIcal, setEditPromoIcal] = useState('');
  const [editPromoArrivee, setEditPromoArrivee] = useState('');
  const [editPromoDepart, setEditPromoDepart] = useState('');
  const [editPromoReferentId, setEditPromoReferentId] = useState('');
  const [editingPromoId, setEditingPromoId] = useState('');
  const [studentsPopupPromoId, setStudentsPopupPromoId] = useState('');
  const [promoStudents, setPromoStudents] = useState<PromotionStudent[]>([]);
  const [selectedStudentForPromo, setSelectedStudentForPromo] = useState('');

  const [profPrenom, setProfPrenom] = useState('');
  const [profNom, setProfNom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profBirthDate, setProfBirthDate] = useState('1980-01-01');
  const [isCreatingProf, setIsCreatingProf] = useState(false);

  const [selectedProfId, setSelectedProfId] = useState('');
  const [editProfPrenom, setEditProfPrenom] = useState('');
  const [editProfNom, setEditProfNom] = useState('');
  const [editProfEmail, setEditProfEmail] = useState('');
  const [editingProfId, setEditingProfId] = useState('');

  const [selectedMatiereCode, setSelectedMatiereCode] = useState('');
  const [editMatiereNom, setEditMatiereNom] = useState('');

  const [selectedDelegueId, setSelectedDelegueId] = useState('');
  const [editStudentNumero, setEditStudentNumero] = useState('');
  const [editStudentPrenom, setEditStudentPrenom] = useState('');
  const [editStudentNom, setEditStudentNom] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentBirthDate, setEditStudentBirthDate] = useState('');

  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const selectedCount = selectedUserIds.length;
  const canCreatePromotion = useMemo(() => {
    return (
      promoName.trim().length > 0 &&
      imageUrl.trim().length > 0 &&
      Number.isInteger(Number(anneeArrivee)) &&
      Number.isInteger(Number(anneeDepart)) &&
      selectedCount > 0
    );
  }, [anneeArrivee, anneeDepart, imageUrl, promoName, selectedCount]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadingError('');

    try {
      const [usersRes, usersDetailsRes, promosRes, profRes, matieresRes] = await Promise.all([
        adminListUsersRequest(),
        adminListUsersDetailsRequest(),
        adminListPromotionsRequest(),
        adminListProfesseursRequest(),
        adminListMatieresRequest(),
      ]);

      if (!usersRes.ok) {
        setLoadingError(
          await extractErrorMessage(usersRes, 'Impossible de charger les utilisateurs.')
        );
        setUsers([]);
      } else {
        setUsers((await usersRes.json()) as AdminUser[]);
      }

      if (!usersDetailsRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les details des etudiants.');
        setStudentsDetails([]);
      } else {
        setStudentsDetails((await usersDetailsRes.json()) as AdminStudentDetails[]);
      }

      if (!promosRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les promotions.');
        setPromotions([]);
      } else {
        const promoData = (await promosRes.json()) as AdminPromotionSummary[];
        setPromotions(promoData);
        setSelectedPromoId((prev) => prev || promoData[0]?.id || '');
      }

      if (!profRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les professeurs.');
        setProfesseurs([]);
      } else {
        const profData = (await profRes.json()) as AdminProfesseur[];
        setProfesseurs(profData);
        setReferentProfId((prev) => prev || profData[0]?.id || '');
        setSelectedProfId((prev) => prev || profData[0]?.id || '');
      }

      if (!matieresRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les matieres.');
        setMatieres([]);
      } else {
        const matiereData = (await matieresRes.json()) as AdminMatiere[];
        setMatieres(matiereData);
        setSelectedMatiereCode((prev) => prev || matiereData[0]?.code_matiere || '');
      }
    } catch {
      setLoadingError('Erreur reseau. Reessayez.');
      setUsers([]);
      setStudentsDetails([]);
      setPromotions([]);
      setProfesseurs([]);
      setMatieres([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    const promo = promotions.find((item) => item.id === selectedPromoId);
    if (!promo) {
      return;
    }

    setEditPromoName(promo.nom);
    setEditPromoImage(promo.image_url);
    setEditPromoIcal(promo.ical_url ?? '');
    setEditPromoArrivee(String(promo.annee_arrivee));
    setEditPromoDepart(String(promo.annee_depart));
    setEditPromoReferentId(promo.referent_prof_id ?? '');
  }, [promotions, selectedPromoId]);

  useEffect(() => {
    const prof = professeurs.find((item) => item.id === selectedProfId);
    if (!prof) {
      return;
    }

    setEditProfPrenom(prof.prenom);
    setEditProfNom(prof.nom);
    setEditProfEmail(prof.email);
  }, [professeurs, selectedProfId]);

  useEffect(() => {
    const matiere = matieres.find((item) => item.code_matiere === selectedMatiereCode);
    if (!matiere) {
      return;
    }

    setEditMatiereNom(matiere.nom_matiere);
  }, [matieres, selectedMatiereCode]);

  const runAction = async (
    action: () => Promise<Response>,
    successMessage: string,
    refresh = true
  ) => {
    setFeedback({ type: '', message: '' });
    try {
      const response = await action();
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Operation impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: successMessage });
      if (refresh) {
        await loadAdminData();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    }
  };

  const openEditPromotionPopup = (promotion: AdminPromotionSummary) => {
    setEditingPromoId(promotion.id);
    setSelectedPromoId(promotion.id);
    setEditPromoName(promotion.nom);
    setEditPromoImage(promotion.image_url);
    setEditPromoIcal(promotion.ical_url ?? '');
    setEditPromoArrivee(String(promotion.annee_arrivee));
    setEditPromoDepart(String(promotion.annee_depart));
    setEditPromoReferentId(promotion.referent_prof_id ?? '');
  };

  const openStudentsPopup = async (promoId: string) => {
    setStudentsPopupPromoId(promoId);
    setPromoStudents([]);
    setSelectedStudentForPromo('');
    const response = await adminListPromotionStudentsRequest(promoId);
    if (response.ok) {
      const students = (await response.json()) as PromotionStudent[];
      setPromoStudents(students);
      setSelectedStudentForPromo(students[0]?.id ?? '');
    }
  };

  const toggleStudentDetails = (student: AdminStudentDetails) => {
    if (expandedStudentId === student.id) {
      setExpandedStudentId('');
      return;
    }
    setExpandedStudentId(student.id);
    setEditStudentNumero(student.numero_etudiant ?? '');
    setEditStudentPrenom(student.prenom);
    setEditStudentNom(student.nom);
    setEditStudentEmail(student.email);
    setEditStudentBirthDate(student.date_naissance);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateProfessor = async () => {
    if (!profNom.trim() || !profPrenom.trim() || !profEmail.trim() || !profBirthDate.trim()) {
      setFeedback({
        type: 'error',
        message: 'Prenom, nom, email et date de naissance sont requis.',
      });
      return;
    }

    setIsCreatingProf(true);
    await runAction(
      () =>
        adminCreateProfesseurRequest({
          prenom: profPrenom,
          nom: profNom,
          email: profEmail,
          date_naissance: profBirthDate,
        }),
      'Professeur cree avec succes.'
    );
    setIsCreatingProf(false);
  };

  const handleCreatePromotion = async () => {
    if (!canCreatePromotion) {
      setFeedback({
        type: 'error',
        message: 'Nom, image, annees arrivee/depart et au moins un utilisateur sont requis.',
      });
      return;
    }

    setIsCreatingPromotion(true);
    await runAction(
      () =>
        adminCreatePromotionRequest({
          nom: promoName.trim(),
          image_url: imageUrl.trim(),
          ical_url: icalUrl.trim() || undefined,
          annee_arrivee: Number(anneeArrivee),
          annee_depart: Number(anneeDepart),
          referent_prof_id: referentProfId || undefined,
          etudiant_ids: selectedUserIds,
        }),
      'Promotion creee avec succes.'
    );
    setIsCreatingPromotion(false);
  };

  const handleAssignDelegue = async (remove = false) => {
    if (!selectedPromoId || !selectedDelegueId) {
      setFeedback({ type: 'error', message: 'Selectionnez une promotion et un etudiant.' });
      return;
    }

    await runAction(
      () =>
        remove
          ? adminRemoveDelegueRequest(selectedPromoId, selectedDelegueId)
          : adminAssignDelegueRequest(selectedPromoId, selectedDelegueId),
      remove ? 'Delegue retire de la promotion.' : 'Delegue assigne a la promotion.'
    );
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } finally {
      navigate('/', { replace: true });
      setIsLoggingOut(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    isLoggingOut,
    users,
    studentsDetails,
    expandedStudentId,
    promotions,
    professeurs,
    matieres,
    isLoading,
    loadingError,
    promoName,
    setPromoName,
    selectedUserIds,
    imageUrl,
    setImageUrl,
    icalUrl,
    setIcalUrl,
    anneeArrivee,
    setAnneeArrivee,
    anneeDepart,
    setAnneeDepart,
    referentProfId,
    setReferentProfId,
    isCreatingPromotion,
    selectedPromoId,
    setSelectedPromoId,
    editPromoName,
    setEditPromoName,
    editPromoImage,
    setEditPromoImage,
    editPromoIcal,
    setEditPromoIcal,
    editPromoArrivee,
    setEditPromoArrivee,
    editPromoDepart,
    setEditPromoDepart,
    editPromoReferentId,
    setEditPromoReferentId,
    editingPromoId,
    setEditingPromoId,
    studentsPopupPromoId,
    setStudentsPopupPromoId,
    promoStudents,
    selectedStudentForPromo,
    setSelectedStudentForPromo,
    profPrenom,
    setProfPrenom,
    profNom,
    setProfNom,
    profEmail,
    setProfEmail,
    profBirthDate,
    setProfBirthDate,
    isCreatingProf,
    selectedProfId,
    setSelectedProfId,
    editProfPrenom,
    setEditProfPrenom,
    editProfNom,
    setEditProfNom,
    editProfEmail,
    setEditProfEmail,
    editingProfId,
    setEditingProfId,
    selectedMatiereCode,
    setSelectedMatiereCode,
    editMatiereNom,
    setEditMatiereNom,
    selectedDelegueId,
    setSelectedDelegueId,
    editStudentNumero,
    setEditStudentNumero,
    editStudentPrenom,
    setEditStudentPrenom,
    editStudentNom,
    setEditStudentNom,
    editStudentEmail,
    setEditStudentEmail,
    editStudentBirthDate,
    setEditStudentBirthDate,
    feedback,
    selectedCount,
    canCreatePromotion,
    runAction,
    openEditPromotionPopup,
    openStudentsPopup,
    toggleStudentDetails,
    toggleUser,
    handleCreateProfessor,
    handleCreatePromotion,
    handleAssignDelegue,
    handleLogout,
  };
}

export type AdminController = ReturnType<typeof useAdminController>;
