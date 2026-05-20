export type AuthMode = 'login' | 'register';
export type ThemeMode = 'light' | 'dark';
export type SubmitStateType = '' | 'success' | 'error';

export type SubmitState = {
  type: SubmitStateType;
  message: string;
};

export type AuthFields = {
  fullName: string;
  studentNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
};

export const emptySubmitState: SubmitState = {
  type: '',
  message: '',
};
