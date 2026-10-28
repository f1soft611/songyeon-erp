export type PermissionSet = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type RoleManagementRow = {
  id: string;
  name: string;
  description: string;
  group: string;
  menuCount: number;
  active: boolean;
  permissions: PermissionSet;
};
