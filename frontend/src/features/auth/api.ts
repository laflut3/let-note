import type { AuthFields } from '@/features/auth/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type AdminUser = {
  id: string;
  numero_etudiant: string | null;
  nom: string;
  prenom: string;
  email: string;
};

export type CreatePromotionPayload = {
  nom: string;
  image_url: string;
  ical_url?: string;
  annee_arrivee: number;
  annee_depart: number;
  referent_prof_id: string;
  etudiant_ids: string[];
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
  ue_id: string | null;
  ue_semestre: number | null;
  coef_ue: number | null;
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
  etudiants: {
    id: string;
    numero_etudiant: string | null;
    nom: string;
    prenom: string;
    email: string;
  }[];
  matieres: MatiereDashboardItem[];
  professeurs: ProfesseurDashboardItem[];
  resultats: {
    id: string;
    id_mat: string;
    nom_matiere: string;
    id_etu: string;
    etu_numero: string | null;
    etu_nom: string;
    etu_prenom: string;
    libelle: string;
    session: number | null;
    note: number;
    coef: number;
    updated_at: string;
  }[];
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
};

export type AdminProfesseur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export type UeItem = {
  id: string;
  semestre: number;
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
      numero_etudiant: fields.studentNumber,
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

export async function listUesRequest(promoId: string): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/ues`, { method: 'GET' });
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
  payload: { code_matiere: string; nom_matiere: string; ue_id: string; coef_ue?: number }
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

export async function createUeRequest(
  promoId: string,
  payload: { semestre: number }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/ues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function createResultatRequest(
  promoId: string,
  matiereId: string,
  payload: {
    etudiant_id?: string;
    libelle: string;
    session?: number;
    note: number;
    coef?: number;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/matieres/${matiereId}/resultats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateResultatRequest(
  promoId: string,
  resultatId: string,
  payload: {
    libelle?: string;
    session?: number;
    note?: number;
    coef?: number;
  }
): Promise<Response> {
  return jsonRequest(`/promotions/${promoId}/resultats/${resultatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
