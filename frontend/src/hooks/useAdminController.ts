import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  adminAssignDelegueRequest,
  adminCreateMatiereRequest,
  adminCreateMatiereResourceRequest,
  adminCreateProfesseurRequest,
  adminDeleteMatiereResourceRequest,
  adminLinkMatierePromotionRequest,
  adminCreatePromotionRequest,
  adminListMatiereResourcesRequest,
  adminListPromotionStudentsRequest,
  adminListMatieresRequest,
  adminListProfesseursRequest,
  adminListPromotionsRequest,
  adminListUsersDetailsRequest,
  adminListUsersRequest,
  adminRemoveDelegueRequest,
  attachUeToPromotionRequest,
  createCatalogUeRequest,
  createUeRequest,
  deleteCatalogUeRequest,
  deleteUeRequest,
  listAllUesRequest,
  listUesRequest,
  logoutRequest,
  updateCatalogUeRequest,
  updateUeRequest,
  type AdminMatiere,
  type AdminMatiereResource,
  type AdminProfesseur,
  type AdminPromotionSummary,
  type AdminStudentDetails,
  type AdminUser,
  type PromotionStudent,
  type UeItem,
} from '@/services/api';
import type { SortDirection } from '@/types/common';

export type AdminTab = 'promotions' | 'etudiants' | 'professeurs' | 'matieres' | 'ues' | 'devoirs';

export type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

export type ConfirmDialog = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm?: () => void;
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
  const [profBirthDate, setProfBirthDate] = useState('');
  const [isCreatingProf, setIsCreatingProf] = useState(false);

  const [selectedProfId, setSelectedProfId] = useState('');
  const [editProfPrenom, setEditProfPrenom] = useState('');
  const [editProfNom, setEditProfNom] = useState('');
  const [editProfEmail, setEditProfEmail] = useState('');
  const [editingProfId, setEditingProfId] = useState('');

  const [selectedMatiereCode, setSelectedMatiereCode] = useState('');
  const [editMatiereNom, setEditMatiereNom] = useState('');
  const [newMatiereCode, setNewMatiereCode] = useState('');
  const [newMatiereNom, setNewMatiereNom] = useState('');
  const [matiereResources, setMatiereResources] = useState<AdminMatiereResource[]>([]);
  const [linkPromoId, setLinkPromoId] = useState('');
  const [linkUes, setLinkUes] = useState<UeItem[]>([]);
  const [linkUeId, setLinkUeId] = useState('');
  const [newLinkUeNom, setNewLinkUeNom] = useState('');
  const [newLinkUeSemestre, setNewLinkUeSemestre] = useState('');
  const [editLinkUeId, setEditLinkUeId] = useState('');
  const [editLinkUeNom, setEditLinkUeNom] = useState('');
  const [editLinkUeSemestre, setEditLinkUeSemestre] = useState('');
  const [linkReferentProfId, setLinkReferentProfId] = useState('');
  const [linkCoef, setLinkCoef] = useState('');
  const [resourceType, setResourceType] = useState<'cours' | 'td' | 'tp' | 'exam'>('cours');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);

  const [selectedDelegueId, setSelectedDelegueId] = useState('');
  const [editStudentNumero, setEditStudentNumero] = useState('');
  const [editStudentPrenom, setEditStudentPrenom] = useState('');
  const [editStudentNom, setEditStudentNom] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentBirthDate, setEditStudentBirthDate] = useState('');

  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirmer',
  });
  const [promotionSearch, setPromotionSearch] = useState('');
  const [promotionSort, setPromotionSort] = useState<SortDirection>('asc');
  const [profSearch, setProfSearch] = useState('');
  const [profSort, setProfSort] = useState<SortDirection>('asc');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<SortDirection>('asc');
  const [matiereSearch, setMatiereSearch] = useState('');
  const [matiereSort, setMatiereSort] = useState<SortDirection>('asc');
  const [ueItems, setUeItems] = useState<UeItem[]>([]);
  const [newUeNom, setNewUeNom] = useState('');
  const [newUeSemestre, setNewUeSemestre] = useState('');
  const [editUeId, setEditUeId] = useState('');
  const [editUeNom, setEditUeNom] = useState('');
  const [editUeSemestre, setEditUeSemestre] = useState('');

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

  const filteredPromotions = useMemo(() => {
    const query = promotionSearch.trim().toLowerCase();
    const filtered = promotions.filter((item) => {
      if (!query) return true;
      return (
        item.nom.toLowerCase().includes(query) ||
        String(item.annee_arrivee).includes(query) ||
        String(item.annee_depart).includes(query) ||
        item.delegues.join(' ').toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const cmp = a.nom.localeCompare(b.nom, 'fr');
      return promotionSort === 'asc' ? cmp : -cmp;
    });
  }, [promotions, promotionSearch, promotionSort]);

  const filteredProfesseurs = useMemo(() => {
    const query = profSearch.trim().toLowerCase();
    const filtered = professeurs.filter((item) => {
      if (!query) return true;
      return (
        item.prenom.toLowerCase().includes(query) ||
        item.nom.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr');
      return profSort === 'asc' ? cmp : -cmp;
    });
  }, [professeurs, profSearch, profSort]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    const filtered = studentsDetails.filter((item) => {
      if (!query) return true;
      return (
        item.prenom.toLowerCase().includes(query) ||
        item.nom.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.numero_etudiant ?? '').toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr');
      return studentSort === 'asc' ? cmp : -cmp;
    });
  }, [studentsDetails, studentSearch, studentSort]);

  const filteredMatieres = useMemo(() => {
    const query = matiereSearch.trim().toLowerCase();
    const filtered = matieres.filter((item) => {
      if (!query) return true;
      return (
        item.nom_matiere.toLowerCase().includes(query) ||
        item.code_matiere.toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const cmp = a.nom_matiere.localeCompare(b.nom_matiere, 'fr');
      return matiereSort === 'asc' ? cmp : -cmp;
    });
  }, [matieres, matiereSearch, matiereSort]);

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

  useEffect(() => {
    setEditingPromoId('');
    setEditingProfId('');
    setStudentsPopupPromoId('');
    setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  }, [activeTab]);

  useEffect(() => {
    const loadResources = async () => {
      if (!selectedMatiereCode) {
        setMatiereResources([]);
        return;
      }
      const response = await adminListMatiereResourcesRequest(selectedMatiereCode);
      if (!response.ok) {
        setMatiereResources([]);
        return;
      }
      setMatiereResources((await response.json()) as AdminMatiereResource[]);
    };

    void loadResources();
  }, [selectedMatiereCode]);

  useEffect(() => {
    const loadUes = async () => {
      const response = await listAllUesRequest();
      if (!response.ok) {
        setUeItems([]);
        return;
      }
      setUeItems((await response.json()) as UeItem[]);
    };
    void loadUes();
  }, []);

  useEffect(() => {
    const loadUesForPromo = async () => {
      if (!linkPromoId) {
        setLinkUes([]);
        setLinkUeId('');
        return;
      }
      const response = await listUesRequest(linkPromoId);
      if (!response.ok) {
        setLinkUes([]);
        setLinkUeId('');
        return;
      }
      const data = (await response.json()) as UeItem[];
      setLinkUes(data);
      setLinkUeId((prev) => (data.some((ue) => ue.id === prev) ? prev : data[0]?.id || ''));
    };
    void loadUesForPromo();
  }, [linkPromoId]);

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

  const handleCreateMatiere = async () => {
    if (!newMatiereCode.trim() || !newMatiereNom.trim()) {
      setFeedback({ type: 'error', message: 'Code et nom de matiere requis.' });
      return;
    }

    await runAction(
      () =>
        adminCreateMatiereRequest({
          code_matiere: newMatiereCode.trim().toUpperCase(),
          nom_matiere: newMatiereNom.trim(),
        }),
      'Matiere creee avec succes.'
    );
    setNewMatiereCode('');
    setNewMatiereNom('');
  };

  const handleCreateMatiereResource = async () => {
    if (!selectedMatiereCode || !resourceTitle.trim() || !resourceFile) {
      setFeedback({ type: 'error', message: 'Matiere, titre et fichier sont requis.' });
      return;
    }

    await runAction(
      () =>
        adminCreateMatiereResourceRequest(selectedMatiereCode, {
          type_metier: resourceType,
          title: resourceTitle.trim(),
          description: resourceDescription.trim() || undefined,
          file: resourceFile,
        }),
      'Fichier de matiere ajoute.',
      false
    );

    const refreshed = await adminListMatiereResourcesRequest(selectedMatiereCode);
    if (refreshed.ok) {
      setMatiereResources((await refreshed.json()) as AdminMatiereResource[]);
    }
    setResourceTitle('');
    setResourceDescription('');
    setResourceFile(null);
  };

  const handleDeleteMatiereResource = async (resourceId: string) => {
    await runAction(
      () => adminDeleteMatiereResourceRequest(resourceId),
      'Fichier de matiere supprime.',
      false
    );
    if (!selectedMatiereCode) return;
    const refreshed = await adminListMatiereResourcesRequest(selectedMatiereCode);
    if (refreshed.ok) {
      setMatiereResources((await refreshed.json()) as AdminMatiereResource[]);
    }
  };

  const handleLinkMatiereToPromotion = async () => {
    if (!selectedMatiereCode || !linkPromoId || !linkUeId || !linkReferentProfId) {
      setFeedback({
        type: 'error',
        message: 'Matiere, promotion, UE et professeur referent sont requis.',
      });
      return;
    }

    await runAction(
      () =>
        adminLinkMatierePromotionRequest(selectedMatiereCode, {
          promo_id: linkPromoId,
          ue_id: linkUeId,
          coef_ue: Number(linkCoef) || 1,
          referent_prof_id: linkReferentProfId,
        }),
      'Matiere liee a la promotion.'
    );
  };

  const refreshLinkUes = async () => {
    if (!linkPromoId) return;
    const response = await listUesRequest(linkPromoId);
    if (!response.ok) return;
    const data = (await response.json()) as UeItem[];
    setLinkUes(data);
    setLinkUeId((prev) => (data.some((ue) => ue.id === prev) ? prev : data[0]?.id || ''));
  };

  const handleCreateUeForLinkPromo = async () => {
    if (!linkPromoId) {
      setFeedback({ type: 'error', message: 'Selectionnez une promotion.' });
      return;
    }
    if (!newLinkUeNom.trim()) {
      setFeedback({ type: 'error', message: 'Nom UE requis.' });
      return;
    }
    await runAction(
      () =>
        createUeRequest(linkPromoId, {
          nom_ue: newLinkUeNom.trim(),
          semestre: Number(newLinkUeSemestre) || 1,
        }),
      'UE creee.',
      false
    );
    await refreshLinkUes();
  };

  const handleUpdateUeForLinkPromo = async () => {
    if (!linkPromoId || !editLinkUeId) {
      setFeedback({ type: 'error', message: 'Selectionnez une UE.' });
      return;
    }
    await runAction(
      () =>
        updateUeRequest(linkPromoId, editLinkUeId, {
          nom_ue: editLinkUeNom.trim() || undefined,
          semestre: Number(editLinkUeSemestre) || 1,
        }),
      'UE modifiee.',
      false
    );
    await refreshLinkUes();
  };

  const handleDeleteUeForLinkPromo = async (ueId: string) => {
    if (!linkPromoId) return;
    await runAction(() => deleteUeRequest(linkPromoId, ueId), 'UE supprimee.', false);
    await refreshLinkUes();
  };

  const refreshAdminUes = async () => {
    const response = await listAllUesRequest();
    if (!response.ok) return;
    setUeItems((await response.json()) as UeItem[]);
  };

  const handleCreateAdminUe = async () => {
    if (!newUeNom.trim()) {
      setFeedback({ type: 'error', message: 'Nom UE requis.' });
      return;
    }
    await runAction(
      () =>
        createCatalogUeRequest({
          nom_ue: newUeNom.trim(),
          semestre: Number(newUeSemestre) || 1,
        }),
      'UE creee.',
      false
    );
    await refreshAdminUes();
  };

  const handleUpdateAdminUe = async () => {
    if (!editUeId) {
      setFeedback({ type: 'error', message: 'Selectionnez une UE.' });
      return;
    }
    await runAction(
      () =>
        updateCatalogUeRequest(editUeId, {
          nom_ue: editUeNom.trim() || undefined,
          semestre: Number(editUeSemestre) || 1,
        }),
      'UE modifiee.',
      false
    );
    await refreshAdminUes();
  };

  const handleDeleteAdminUe = async (ueId: string) => {
    await runAction(() => deleteCatalogUeRequest(ueId), 'UE supprimee.', false);
    await refreshAdminUes();
  };

  const handleAttachAdminUe = async (ueId: string, promoIds: string[]) => {
    if (!ueId || promoIds.length === 0) {
      setFeedback({ type: 'error', message: 'Selectionnez au moins une promotion.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    for (const promoId of promoIds) {
      const response = await attachUeToPromotionRequest(promoId, ueId);
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Impossible de lier UE a une promotion.'),
        });
        return;
      }
    }
    setFeedback({ type: 'success', message: 'UE liee aux promotions selectionnees.' });
    await refreshAdminUes();
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

  const openConfirmDialog = (dialog: Omit<ConfirmDialog, 'open'>) => {
    setConfirmDialog({ ...dialog, open: true });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  };

  const confirmDialogAction = () => {
    const action = confirmDialog.onConfirm;
    closeConfirmDialog();
    action?.();
  };

  return {
    activeTab,
    setActiveTab,
    isLoggingOut,
    users,
    studentsDetails,
    expandedStudentId,
    promotions,
    filteredPromotions,
    professeurs,
    filteredProfesseurs,
    matieres,
    filteredMatieres,
    filteredStudents,
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
    newMatiereCode,
    setNewMatiereCode,
    newMatiereNom,
    setNewMatiereNom,
    matiereResources,
    resourceType,
    setResourceType,
    resourceTitle,
    setResourceTitle,
    resourceDescription,
    setResourceDescription,
    resourceFile,
    setResourceFile,
    linkPromoId,
    setLinkPromoId,
    linkUes,
    linkUeId,
    setLinkUeId,
    newLinkUeNom,
    setNewLinkUeNom,
    newLinkUeSemestre,
    setNewLinkUeSemestre,
    editLinkUeId,
    setEditLinkUeId,
    editLinkUeNom,
    setEditLinkUeNom,
    editLinkUeSemestre,
    setEditLinkUeSemestre,
    linkReferentProfId,
    setLinkReferentProfId,
    linkCoef,
    setLinkCoef,
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
    setFeedback,
    confirmDialog,
    promotionSearch,
    setPromotionSearch,
    promotionSort,
    setPromotionSort,
    profSearch,
    setProfSearch,
    profSort,
    setProfSort,
    studentSearch,
    setStudentSearch,
    studentSort,
    setStudentSort,
    matiereSearch,
    setMatiereSearch,
    matiereSort,
    setMatiereSort,
    ueItems,
    newUeNom,
    setNewUeNom,
    newUeSemestre,
    setNewUeSemestre,
    editUeId,
    setEditUeId,
    editUeNom,
    setEditUeNom,
    editUeSemestre,
    setEditUeSemestre,
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
    handleCreateMatiere,
    handleCreateMatiereResource,
    handleDeleteMatiereResource,
    handleLinkMatiereToPromotion,
    handleCreateUeForLinkPromo,
    handleUpdateUeForLinkPromo,
    handleDeleteUeForLinkPromo,
    refreshAdminUes,
    handleCreateAdminUe,
    handleUpdateAdminUe,
    handleDeleteAdminUe,
    handleAttachAdminUe,
    handleLogout,
    openConfirmDialog,
    closeConfirmDialog,
    confirmDialogAction,
  };
}

export type AdminController = ReturnType<typeof useAdminController>;
