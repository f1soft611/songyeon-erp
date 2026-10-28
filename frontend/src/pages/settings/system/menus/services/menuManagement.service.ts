import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import type {
  MenuManagementRow,
  MenuModuleOption,
  MenuPermissionDefinition,
} from '../types/menuManagement.types';

interface SystemMenuVO {
  menuId: number;
  moduleId: number;
  moduleNm: string;
  parentMenuId: number | null;
  parentMenuNm: string | null;
  menuCode: string;
  menuNm: string;
  menuDc: string | null;
  menuUrl: string | null;
  iconNm: string | null;
  sortOrder: number;
  useAt: string;
  hasChildren: boolean;
  permissionCodes?: unknown;
}

interface SystemModuleVO {
  moduleId: unknown;
  moduleNm?: unknown;
  useAt?: unknown;
}

interface SystemPermissionVO {
  permissionId: unknown;
  permissionCode?: unknown;
  permissionName?: unknown;
  sortOrder?: unknown;
}

interface SystemMenuSaveResponse {
  item?: {
    menuId?: unknown;
  };
}

export type MenuSaveResult = {
  insertedMenuIds: Record<string, string>;
};

export type MenuSaveCheckpoint = {
  completedOperations: Set<string>;
  insertedMenuIds: Record<string, string>;
};

export function createMenuSaveCheckpoint(): MenuSaveCheckpoint {
  return {
    completedOperations: new Set(),
    insertedMenuIds: {},
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPermissionCodes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((code): code is string => typeof code === 'string')
    : [];
}

const toRow = (menu: SystemMenuVO): MenuManagementRow => ({
  id: String(menu.menuId),
  moduleId: toNumber(menu.moduleId),
  moduleName: String(menu.moduleNm ?? ''),
  parentMenuId: menu.parentMenuId === null ? null : String(menu.parentMenuId),
  hasChildren: Boolean(menu.hasChildren),
  code: String(menu.menuCode ?? ''),
  name: String(menu.menuNm ?? ''),
  path: menu.menuUrl ?? '',
  iconName: menu.iconNm,
  parent: menu.parentMenuNm ?? menu.moduleNm,
  order: menu.sortOrder,
  enabled: menu.useAt === 'Y',
  status: 'confirmed',
  description: menu.menuDc ?? '',
  permissionGroup: String(menu.moduleNm ?? ''),
  permissionCodes: toPermissionCodes(menu.permissionCodes),
});

export async function fetchModules(): Promise<MenuModuleOption[]> {
  const result = await apiGet<{ resultList: SystemModuleVO[] }>(
    '/api/v1/system/modules',
  );
  return (result.resultList ?? [])
    .filter((module) => module.useAt === undefined || module.useAt === 'Y')
    .map((module) => ({
      moduleId: toNumber(module.moduleId),
      moduleName: String(module.moduleNm ?? ''),
    }));
}

export async function fetchActivePermissions(): Promise<
  MenuPermissionDefinition[]
> {
  const result = await apiGet<{ resultList: SystemPermissionVO[] }>(
    '/api/v1/system/permissions',
  );
  return (result.resultList ?? [])
    .map((permission) => ({
      permissionId: toNumber(permission.permissionId),
      permissionCode: String(permission.permissionCode ?? ''),
      permissionName: String(permission.permissionName ?? ''),
      sortOrder: toNumber(permission.sortOrder),
    }))
    .filter((permission) => permission.permissionCode.length > 0)
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

export async function fetchMenuRows(
  moduleId: number,
  roleId?: string,
): Promise<MenuManagementRow[]> {
  const query = roleId ? `&roleId=${roleId}` : '';
  const result = await apiGet<{ resultList: SystemMenuVO[] }>(
    `/api/v1/system/menus?moduleId=${moduleId}${query}`,
  );
  return (result.resultList ?? []).map(toRow);
}

export async function replaceMenuPermissions(
  menuId: string,
  permissionCodes: string[],
): Promise<void> {
  await apiPut(`/api/v1/system/menus/${menuId}/permissions`, {
    permissionCodes,
  });
}

export async function saveRoleMenuPermissions(
  roleId: string,
  menuPermissions: Array<{
    menuId: string | number;
    permissionCodes: string[];
  }>,
): Promise<void> {
  await apiPut(`/api/v1/system/roles/${roleId}/menu-permissions`, {
    menuPermissions: menuPermissions.map(({ menuId, permissionCodes }) => ({
      menuId: Number(menuId),
      permissionCodes: (permissionCodes ?? []).filter(
        (code): code is string =>
          typeof code === 'string' && code.trim().length > 0,
      ),
    })),
  });
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'null') {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function toSaveRequest(
  row: MenuManagementRow,
  insertedMenuIds: Record<string, string> = {},
) {
  const resolvedParentMenuId = row.parentMenuId
    ? (insertedMenuIds[row.parentMenuId] ?? row.parentMenuId)
    : null;

  return {
    moduleId: row.moduleId,
    parentMenuId: toNullableNumber(resolvedParentMenuId),
    menuCode: row.code.trim(),
    menuNm: row.name.trim(),
    menuDc: row.description.trim() || null,
    menuUrl: row.path || null,
    iconNm: row.iconName,
    sortOrder: row.order,
    useAt: row.enabled ? 'Y' : 'N',
  };
}

export async function saveMenuChanges(
  changes: F1GridChanges<MenuManagementRow>,
  checkpoint: MenuSaveCheckpoint = createMenuSaveCheckpoint(),
): Promise<MenuSaveResult> {
  for (const row of changes.insertedRows) {
    const operationKey = `insert:${row.id}`;
    if (checkpoint.completedOperations.has(operationKey)) continue;
    const result = await apiPost<SystemMenuSaveResponse>(
      '/api/v1/system/menus',
      toSaveRequest(row, checkpoint.insertedMenuIds),
    );
    const menuId = String(result.item?.menuId ?? '').trim();
    if (!menuId) {
      throw new Error('등록된 메뉴 ID를 확인할 수 없습니다.');
    }
    checkpoint.insertedMenuIds[row.id] = menuId;
    checkpoint.completedOperations.add(operationKey);
  }
  for (const row of changes.updatedRows) {
    const operationKey = `update:${row.id}`;
    if (checkpoint.completedOperations.has(operationKey)) continue;
    await apiPut(
      `/api/v1/system/menus/${row.id}`,
      toSaveRequest(row, checkpoint.insertedMenuIds),
    );
    checkpoint.completedOperations.add(operationKey);
  }
  for (const row of changes.deletedRows) {
    const operationKey = `delete:${row.id}`;
    if (checkpoint.completedOperations.has(operationKey)) continue;
    await apiDelete(`/api/v1/system/menus/${row.id}`);
    checkpoint.completedOperations.add(operationKey);
  }
  return { insertedMenuIds: checkpoint.insertedMenuIds };
}
