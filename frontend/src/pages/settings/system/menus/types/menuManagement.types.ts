export type MenuManagementRow = {
  id: string;
  moduleId: number;
  moduleName: string;
  parentMenuId: string | null;
  hasChildren: boolean;
  code: string;
  name: string;
  path: string;
  iconName: string | null;
  parent: string;
  order: number;
  enabled: boolean;
  status: 'draft' | 'confirmed';
  description: string;
  permissionGroup: string;
  permissionCodes: string[];
};

export type MenuPermissionDefinition = {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  sortOrder: number;
};

export type MenuModuleOption = {
  moduleId: number;
  moduleName: string;
};
