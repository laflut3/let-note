import type { AuthFields } from '@/features/auth/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type AdminUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type CreatePromotionPayload = {
  image_url: string;
  ical_url?: string;
  annee: number;
  etudiant_ids: string[];
};

export type PromotionScope = {
  id: string;
  image_url: string;
  ical_url: string | null;
  annee_debut: string;
  annee_fin: string;
  can_manage: boolean;
};

export type MatiereDashboardItem = {
  code_matiere: string;
  nom_matiere: string;
  referent_prof_id: string | null;
  referent_prof_nom: string | null;
  referent_prof_prenom: string | null;
  referent_prof_email: string | null;
};

export type ProfesseurDashboardItem = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type PromotionDashboardPayload = {
  promotion: PromotionScope;
  matieres: MatiereDashboardItem[];
  professeurs: ProfesseurDashboardItem[];
};

export type AdminPromotionSummary = {
  id: string;
  image_url: string;
  ical_url: string | null;
  annee: number;
  etudiant_count: number;
  delegue_count: number;
};

export type AuthMePayload = {
  email: string;
  roles: string[];
};

async function jsonRequest(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  });
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

export async function adminAssignDelegueRequest(promoId: string, etuId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/delegues/${etuId}`, { method: 'POST' });
}

export async function adminRemoveDelegueRequest(promoId: string, etuId: string): Promise<Response> {
  return jsonRequest(`/admin/promotions/${promoId}/delegues/${etuId}`, { method: 'DELETE' });
}

export async function listAccessiblePromotionsRequest(): Promise<Response> {
  return jsonRequest('/promotions', { method: 'GET' });
}

export async function getPromotionDashboardRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/dashboard`, { method: 'GET' });
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
  payload: { code_matiere: string; nom_matiere: string }
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
  payload: { prenom: string; nom: string; email: string }
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
