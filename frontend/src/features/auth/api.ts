import type { AuthFields } from '@/features/auth/types';

const API_BASE_URL = 'http://127.0.0.1:8080/api';

export async function loginRequest(email: string, password: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(fields: AuthFields): Promise<Response> {
  const [prenom, ...nomParts] = fields.fullName.trim().split(/\s+/);
  const nom = nomParts.join(' ') || prenom;

  return fetch(`${API_BASE_URL}/etudiant`, {
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
