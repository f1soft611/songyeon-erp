export type ModuleManagementRow = {
  id: string;
  moduleCode: string;
  moduleName: string;
  iconName: string;
  moduleUrl: string;
  sortOrder: number;
  menuCount: number;
  use: boolean;
};

export type ModuleSavePayload = {
  moduleCode: string;
  moduleNm: string;
  iconNm?: string | null;
  moduleUrl?: string | null;
  sortOrder: number;
  useAt: 'Y' | 'N';
};

export interface SystemModuleVO {
  moduleId?: unknown;
  tenantId?: unknown;
  moduleCode?: unknown;
  moduleNm?: unknown;
  iconNm?: unknown;
  moduleUrl?: unknown;
  sortOrder?: unknown;
  useAt?: unknown;
  menuCount?: unknown;
}
