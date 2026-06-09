import type { AuthFields } from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type AdminUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type AdminStudentDetails = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  date_naissance: string;
  roles: string[];
  promotions: {
    promo_id: string;
    promo_nom: string;
    annee_arrivee: number;
    annee_depart: number;
    is_delegue: boolean;
  }[];
};

export type CreatePromotionPayload = {
  nom: string;
  image_url: string;
  ical_url?: string;
  annee_arrivee: number;
  annee_depart: number;
  referent_prof_id?: string;
  etudiant_ids: string[];
};

export type PromotionStudent = AdminUser & {
  is_delegue: boolean;
};

export type PromotionScope = {
  id: string;
  nom: string;
  image_url: string;
  ical_url: string | null;
  annee_arrivee: number;
  annee_depart: number;
  referent_prof_id: string | null;
  referent_prof_nom: string | null;
  referent_prof_prenom: string | null;
  referent_prof_email: string | null;
  can_manage: boolean;
};

export type MatiereDashboardItem = {
  code_matiere: string;
  nom_matiere: string;
  referent_prof_id: string | null;
  referent_prof_nom: string | null;
  referent_prof_prenom: string | null;
  referent_prof_email: string | null;
  resources: {
    id: string;
    id_mat: string;
    id_promo: string | null;
    type_metier: 'cours' | 'td' | 'tp' | 'exam';
    title: string;
    description: string | null;
    s3_bucket: string;
    s3_key: string;
    url: string | null;
    content_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }[];
};

export type ProfesseurDashboardItem = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type PromotionDashboardPayload = {
  promotion: PromotionScope;
  etudiants: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  }[];
  matieres: MatiereDashboardItem[];
  professeurs: ProfesseurDashboardItem[];
  devoirs: DevoirItem[];
  events: PromotionEventItem[];
};

export type PromotionEventItem = {
  id: string | null;
  id_etu: string;
  student_nom: string;
  student_prenom: string;
  event_type: 'birthday' | 'croissantage';
  title: string;
  event_month: number;
  event_day: number;
  occurrence_date: string;
  is_today: boolean;
};

export type StudentEventConfig = {
  id: string;
  id_etu: string;
  student_nom: string;
  student_prenom: string;
  event_type: 'croissantage';
  title: string;
  event_month: number;
  event_day: number;
  updated_at: string;
};

export type DevoirItem = {
  id: string;
  id_promo: string;
  id_mat: string;
  nom_matiere: string;
  titre: string;
  description: string | null;
  date_rendu: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPromotionSummary = {
  id: string;
  nom: string;
  image_url: string;
  ical_url: string | null;
  annee_arrivee: number;
  annee_depart: number;
  referent_prof_id: string | null;
  referent_prof_nom: string | null;
  referent_prof_prenom: string | null;
  etudiant_count: number;
  delegue_count: number;
  delegues: string[];
};

export type AdminProfesseur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type AdminMatiere = {
  code_matiere: string;
  nom_matiere: string;
  promotion_count: number;
  linked_promo_ids: string[];
  linked_promotions: string[];
};

export type AdminMatiereResource = {
  id: string;
  id_mat: string;
  id_promo: string | null;
  type_metier: 'cours' | 'td' | 'tp' | 'exam';
  title: string;
  description: string | null;
  s3_bucket: string;
  s3_key: string;
  url: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type AuthMePayload = {
  email: string;
  roles: string[];
};

export type MyProfilePayload = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  date_naissance: string;
  photo_url: string | null;
};

async function jsonRequest(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  });
}

export function toApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function loginRequest(email: string, password: string): Promise<Response> {
  return jsonRequest('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutRequest(): Promise<Response> {
  return jsonRequest('/auth/logout', { method: 'POST' });
}

export async function authMeRequest(): Promise<Response> {
  return jsonRequest('/auth/me', { method: 'GET' });
}

export async function verifyEmailRequest(token: string): Promise<Response> {
  return jsonRequest('/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export async function forgotPasswordRequest(email: string): Promise<Response> {
  return jsonRequest('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordRequest(payload: {
  token: string;
  password: string;
  confirm_password: string;
  understood: boolean;
}): Promise<Response> {
  return jsonRequest('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function changePasswordRequest(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<Response> {
  return jsonRequest('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMyProfileRequest(): Promise<Response> {
  return jsonRequest('/etudiant/me', { method: 'GET' });
}

export async function updateMyProfileRequest(payload: {
  nom?: string;
  prenom?: string;
  email?: string;
  date_naissance?: string;
}): Promise<Response> {
  return jsonRequest('/etudiant/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function uploadMyProfilePhotoRequest(file: File): Promise<Response> {
  const formData = new FormData();
  formData.append('file', file);
  return jsonRequest('/etudiant/me/photo', {
    method: 'POST',
    body: formData,
  });
}

export async function getMyProfilePhotoRequest(): Promise<Response> {
  return jsonRequest('/etudiant/me/photo', { method: 'GET' });
}

export function getResourceFileUrl(resourceId: string, download = false): string {
  const suffix = download ? '?download=true' : '';
  return toApiUrl(`/resources/${resourceId}/file${suffix}`);
}

export async function registerRequest(fields: AuthFields): Promise<Response> {
  const [prenom, ...nomParts] = fields.fullName.trim().split(/\s+/);
  const nom = nomParts.join(' ') || prenom;

  return jsonRequest('/etudiant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nom,
      prenom,
      email: fields.email,
      date_naissance: fields.birthDate,
      mot_de_passe: fields.password,
    }),
  });
}

export async function adminListUsersRequest(): Promise<Response> {
  return jsonRequest('/admin/users', { method: 'GET' });
}

export async function adminListPromotionsRequest(): Promise<Response> {
  return jsonRequest('/admin/promotions', { method: 'GET' });
}

export async function adminListUsersDetailsRequest(): Promise<Response> {
  return jsonRequest('/admin/users/details', { method: 'GET' });
}

export async function adminUpdateUserRequest(
  etuId: string,
  payload: {
    prenom?: string;
    nom?: string;
    email?: string;
    date_naissance?: string;
  }
): Promise<Response> {
  return jsonRequest(`/admin/users/${etuId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUserRequest(etuId: string): Promise<Response> {
  return jsonRequest(`/admin/users/${etuId}`, { method: 'DELETE' });
}

export async function adminListProfesseursRequest(): Promise<Response> {
  return jsonRequest('/admin/professeurs', { method: 'GET' });
}

export async function adminCreateProfesseurRequest(payload: {
  prenom: string;
  nom: string;
  email: string;
  date_naissance: string;
}): Promise<Response> {
  return jsonRequest('/admin/professeurs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateProfesseurRequest(
  profId: string,
  payload: {
    prenom?: string;
    nom?: string;
    email?: string;
    date_naissance?: string;
  }
): Promise<Response> {
  return jsonRequest(`/admin/professeurs/${profId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteProfesseurRequest(profId: string): Promise<Response> {
  return jsonRequest(`/admin/professeurs/${profId}`, { method: 'DELETE' });
}

export async function adminCreatePromotionRequest(
  payload: CreatePromotionPayload
): Promise<Response> {
  return jsonRequest('/admin/promotions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdatePromotionRequest(
  promoId: string,
  payload: {
    nom?: string;
    image_url?: string;
    ical_url?: string;
    annee_arrivee?: number;
    annee_depart?: number;
    referent_prof_id?: string;
  }
): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeletePromotionRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}`, { method: 'DELETE' });
}

export async function adminAssignDelegueRequest(promoId: string, etuId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/delegues/${etuId}`, { method: 'POST' });
}

export async function adminRemoveDelegueRequest(promoId: string, etuId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/delegues/${etuId}`, { method: 'DELETE' });
}

export async function adminListPromotionStudentsRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/etudiants`, { method: 'GET' });
}

export async function adminAddStudentToPromotionRequest(
  promoId: string,
  etuId: string
): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/etudiants/${etuId}`, { method: 'POST' });
}

export async function adminRemoveStudentFromPromotionRequest(
  promoId: string,
  etuId: string
): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/etudiants/${etuId}`, { method: 'DELETE' });
}

export async function adminListMatieresRequest(): Promise<Response> {
  return jsonRequest('/admin/matieres', { method: 'GET' });
}

export async function adminCreateMatiereRequest(payload: {
  code_matiere: string;
  nom_matiere: string;
}): Promise<Response> {
  return jsonRequest('/admin/matieres', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateMatiereRequest(
  codeMatiere: string,
  payload: {
    nom_matiere?: string;
  }
): Promise<Response> {
  return jsonRequest(`/admin/matieres/${codeMatiere}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteMatiereRequest(codeMatiere: string): Promise<Response> {
  return jsonRequest(`/admin/matieres/${codeMatiere}`, { method: 'DELETE' });
}

export async function adminLinkMatierePromotionRequest(
  codeMatiere: string,
  payload: {
    promo_id: string;
    nom_matiere?: string;
    referent_prof_id: string;
  }
): Promise<Response> {
  return jsonRequest(`/admin/matieres/${codeMatiere}/link-promotion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function adminUnlinkMatierePromotionRequest(
  codeMatiere: string,
  promoId: string
): Promise<Response> {
  return jsonRequest(`/admin/matieres/${codeMatiere}/link-promotion/${promoId}`, {
    method: 'DELETE',
  });
}

export async function adminListMatiereResourcesRequest(codeMatiere: string): Promise<Response> {
  return jsonRequest(`/admin/matieres/${codeMatiere}/resources`, { method: 'GET' });
}

export async function adminCreateMatiereResourceRequest(
  codeMatiere: string,
  payload: {
    id_promo?: string;
    type_metier: 'cours' | 'td' | 'tp' | 'exam';
    title: string;
    description?: string;
    file: File;
  }
): Promise<Response> {
  const formData = new FormData();
  formData.append('type_metier', payload.type_metier);
  formData.append('title', payload.title);
  if (payload.id_promo) formData.append('id_promo', payload.id_promo);
  if (payload.description) formData.append('description', payload.description);
  formData.append('file', payload.file);

  return jsonRequest(`/admin/matieres/${codeMatiere}/resources`, {
    method: 'POST',
    body: formData,
  });
}

export async function adminDeleteMatiereResourceRequest(resourceId: string): Promise<Response> {
  return jsonRequest(`/admin/matieres/resources/${resourceId}`, { method: 'DELETE' });
}

export async function listAccessiblePromotionsRequest(): Promise<Response> {
  return jsonRequest('/promotions', { method: 'GET' });
}

export async function getPromotionDashboardRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/dashboard`, { method: 'GET' });
}

export async function getPromotionIcalRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/ical`, { method: 'GET' });
}

export async function updatePromotionIcalRequest(
  promoId: string,
  icalUrl: string
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/ical-url`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ical_url: icalUrl }),
  });
}

export async function addMatiereRequest(
  promoId: string,
  payload: {
    code_matiere: string;
    nom_matiere: string;
    referent_prof_id: string;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/matieres`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function addProfesseurRequest(
  promoId: string,
  payload: { prenom: string; nom: string; email: string; date_naissance?: string }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/professeurs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function setReferentRequest(
  promoId: string,
  matiereId: string,
  profId: string
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/matieres/${matiereId}/referent/${profId}`, {
    method: 'PUT',
  });
}

export async function listDevoirsRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/devoirs`, { method: 'GET' });
}

export async function createDevoirRequest(
  promoId: string,
  payload: {
    id_mat: string;
    titre: string;
    description?: string | null;
    date_rendu?: string | null;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/devoirs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateDevoirRequest(
  promoId: string,
  devoirId: string,
  payload: {
    id_mat?: string;
    titre?: string;
    description?: string | null;
    date_rendu?: string | null;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/devoirs/${devoirId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteDevoirRequest(promoId: string, devoirId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/devoirs/${devoirId}`, { method: 'DELETE' });
}

export async function listStudentEventsRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/student-events`, { method: 'GET' });
}

export async function upsertStudentEventRequest(
  promoId: string,
  payload: {
    id_etu: string;
    event_month: number;
    event_day: number;
    title?: string;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/student-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteStudentEventRequest(
  promoId: string,
  eventId: string
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/student-events/${eventId}`, { method: 'DELETE' });
}
