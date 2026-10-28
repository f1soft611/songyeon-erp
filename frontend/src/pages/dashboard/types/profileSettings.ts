export type MyProfile = {
  userId: string;
  employeeId: number | string;
  name?: string | null;
  email?: string | null;
  departmentName?: string | null;
  levelName?: string | null;
  profileImage?: string | null;
  stampImage?: string | null;
};

export type UpdateMyProfilePayload = {
  email: string;
  profileImage?: string | null;
  stampImage?: string | null;
};

export type ChangeMyPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};
