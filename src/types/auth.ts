export interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface FormErrors {
  username?: string;
  password?: string;
  submit?: string;
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
} 