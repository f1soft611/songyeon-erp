export interface LoginFormValues {
  userId: string;
  password: string;
}

export type LoginFormField = keyof LoginFormValues;
