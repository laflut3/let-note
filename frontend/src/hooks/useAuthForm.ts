import { useState } from 'react';
import { forgotPasswordRequest, loginRequest, registerRequest } from '@/services/api';
import type { AuthFields, AuthMode, SubmitState } from '@/types/auth';
import { emptySubmitState } from '@/types/auth';

type UseAuthFormOptions = {
  onLoginSuccess?: () => void;
};

type UseAuthFormReturn = {
  fields: AuthFields;
  setField: (field: keyof AuthFields, value: string) => void;
  submitState: SubmitState;
  clearSubmitState: () => void;
  submit: (mode: AuthMode) => Promise<void>;
  forgotPassword: () => Promise<void>;
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

      setSubmitState({
        type: 'success',
        message: 'Compte cree. Verifiez votre boite mail pour activer le compte.',
      });
    } catch {
      setSubmitState({ type: 'error', message: 'Erreur reseau. Reessayez dans un instant.' });
    }
  };

  const forgotPassword = async (): Promise<void> => {
    const email = fields.email.trim();
    if (!email) {
      setSubmitState({ type: 'error', message: 'Saisissez votre email avant la demande.' });
      return;
    }

    try {
      const response = await forgotPasswordRequest(email);
      if (!response.ok) {
        setSubmitState({ type: 'error', message: await extractApiErrorMessage(response) });
        return;
      }
      setSubmitState({
        type: 'success',
        message: 'Si ce compte existe, un lien de reinitialisation vient d etre envoye.',
      });
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
    forgotPassword,
  };
}
