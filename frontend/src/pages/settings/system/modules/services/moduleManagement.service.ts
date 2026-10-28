import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  ModuleManagementRow,
  ModuleSavePayload,
  SystemModuleVO,
} from '../types/moduleManagement.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRow = (module: SystemModuleVO): ModuleManagementRow => ({
  id: String(module.moduleId ?? ''),
  moduleCode: String(module.moduleCode ?? ''),
  moduleName: String(module.moduleNm ?? ''),
  iconName: String(module.iconNm ?? ''),
  moduleUrl: String(module.moduleUrl ?? ''),
  sortOrder: toNumber(module.sortOrder),
  menuCount: toNumber(module.menuCount),
  use: String(module.useAt ?? 'Y') !== 'N',
});

export async function fetchModuleRows(): Promise<ModuleManagementRow[]> {
  const result = await apiGet<{ resultList: SystemModuleVO[] }>(
    '/api/v1/system/modules',
  );
  return (result.resultList ?? []).map(toRow);
}

export async function createModule(payload: ModuleSavePayload): Promise<void> {
  await apiPost('/api/v1/system/modules', payload);
}

export async function updateModule(
  moduleId: string,
  payload: ModuleSavePayload,
): Promise<void> {
  await apiPut(`/api/v1/system/modules/${moduleId}`, payload);
}

export async function deleteModule(moduleId: string): Promise<void> {
  await apiDelete(`/api/v1/system/modules/${moduleId}`);
}
