import { useState } from 'react';
import { loginRequest, registerRequest } from '@/features/auth/api';
import type { AuthFields, AuthMode, SubmitState } from '@/features/auth/types';
import { emptySubmitState } from '@/features/auth/types';

type UseAuthFormReturn = {
  fields: AuthFields;
  setField: (field: keyof AuthFields, value: string) => void;
  submitState: SubmitState;
  clearSubmitState: () => void;
  submit: (mode: AuthMode) => Promise<void>;
};

const initialFields: AuthFields = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  birthDate: '',
};

export function useAuthForm(): UseAuthFormReturn {
  const [fields, setFields] = useState<AuthFields>(initialFields);
  const [submitState, setSubmitState] = useState<SubmitState>(emptySubmitState);

  const setField = (field: keyof AuthFields, value: string): void => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const clearSubmitState = (): void => {
    setSubmitState(emptySubmitState);
  };

  const submit = async (mode: AuthMode): Promise<void> => {
    if (mode === 'login') {
      if (!fields.email.trim() || !fields.password.trim()) {
        setSubmitState({ type: 'error', message: 'Email et mot de passe requis.' });
        return;
      }

      const response = await loginRequest(fields.email, fields.password);
      if (!response.ok) {
        const errorText = await response.text();
        setSubmitState({
          type: 'error',
          message: `Connexion impossible: ${errorText || response.statusText}`,
        });
        return;
      }

      setSubmitState({ type: 'success', message: 'Connexion reussie.' });
      return;
    }

    if (
      !fields.fullName.trim() ||
      !fields.email.trim() ||
      !fields.password.trim() ||
      !fields.confirmPassword.trim() ||
      !fields.birthDate
    ) {
      setSubmitState({ type: 'error', message: 'Tous les champs sont requis.' });
      return;
    }

    if (fields.password !== fields.confirmPassword) {
      setSubmitState({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    const response = await registerRequest(fields);
    if (!response.ok) {
      const errorText = await response.text();
      setSubmitState({
        type: 'error',
        message: `Creation impossible: ${errorText || response.statusText}`,
      });
      return;
    }

    setSubmitState({ type: 'success', message: 'Compte etudiant cree avec succes.' });
  };

  return {
    fields,
    setField,
    submitState,
    clearSubmitState,
    submit,
  };
}
