import { useState } from 'react';
import { loginRequest, registerRequest } from '@/features/auth/api';
import type { AuthFields, AuthMode, SubmitState } from '@/features/auth/types';
import { emptySubmitState } from '@/features/auth/types';

type UseAuthFormOptions = {
  onLoginSuccess?: () => void;
};

type UseAuthFormReturn = {
  fields: AuthFields;
  setField: (field: keyof AuthFields, value: string) => void;
  submitState: SubmitState;
  clearSubmitState: () => void;
  submit: (mode: AuthMode) => Promise<void>;
};

const initialFields: AuthFields = {
  fullName: '',
  studentNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  birthDate: '',
};

function requiredFieldsMissing(mode: AuthMode, fields: AuthFields): boolean {
  if (mode === 'login') {
    return !fields.email.trim() || !fields.password.trim();
  }

  return (
    !fields.fullName.trim() ||
    !fields.studentNumber.trim() ||
    !fields.email.trim() ||
    !fields.password.trim() ||
    !fields.confirmPassword.trim() ||
    !fields.birthDate
  );
}

function validationError(mode: AuthMode, fields: AuthFields): string {
  if (requiredFieldsMissing(mode, fields)) {
    return mode === 'login' ? 'Email et mot de passe requis.' : 'Tous les champs sont requis.';
  }

  if (mode === 'register' && fields.password !== fields.confirmPassword) {
    return 'Les mots de passe ne correspondent pas.';
  }

  if (
    mode === 'register' &&
    (fields.studentNumber.trim().length !== 8 || !/^\d{8}$/.test(fields.studentNumber.trim()))
  ) {
    return 'Le numero etudiant doit contenir exactement 8 chiffres.';
  }

  return '';
}

async function extractApiErrorMessage(response: Response): Promise<string> {
  const raw = (await response.text()).trim();
  if (raw) {
    return raw;
  }

  switch (response.status) {
    case 400:
      return 'Requete invalide.';
    case 401:
      return 'Identifiants invalides.';
    case 409:
      return 'Un compte existe deja avec cet email.';
    case 500:
      return 'Erreur serveur. Reessayez dans un instant.';
    default:
      return response.statusText || 'Erreur inconnue.';
  }
}

export function useAuthForm(options: UseAuthFormOptions = {}): UseAuthFormReturn {
  const { onLoginSuccess } = options;
  const [fields, setFields] = useState<AuthFields>(initialFields);
  const [submitState, setSubmitState] = useState<SubmitState>(emptySubmitState);

  const setField = (field: keyof AuthFields, value: string): void => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const clearSubmitState = (): void => {
    setSubmitState(emptySubmitState);
  };

  const submit = async (mode: AuthMode): Promise<void> => {
    const fieldError = validationError(mode, fields);
    if (fieldError) {
      setSubmitState({ type: 'error', message: fieldError });
      return;
    }

    try {
      const response =
        mode === 'login'
          ? await loginRequest(fields.email, fields.password)
          : await registerRequest(fields);

      if (!response.ok) {
        const apiMessage = await extractApiErrorMessage(response);
        setSubmitState({
          type: 'error',
          message:
            mode === 'login'
              ? `Connexion impossible: ${apiMessage}`
              : `Creation impossible: ${apiMessage}`,
        });
        return;
      }

      if (mode === 'login') {
        setSubmitState({ type: 'success', message: 'Connexion reussie.' });
        onLoginSuccess?.();
        return;
      }

      setSubmitState({ type: 'success', message: 'Compte etudiant cree avec succes.' });
    } catch {
      setSubmitState({ type: 'error', message: 'Erreur reseau. Reessayez dans un instant.' });
    }
  };

  return {
    fields,
    setField,
    submitState,
    clearSubmitState,
    submit,
  };
}
