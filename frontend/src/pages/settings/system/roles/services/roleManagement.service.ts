import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type { RoleManagementRow } from '../types/roleManagement.types';

interface SystemRoleVO {
  roleId: number;
  tenantId: number;
  roleCode: string;
  roleNm: string;
  roleDc: string;
  useAt: string;
  isSystemRole: string;
  userCount?: number | string | null;
}

interface RoleUserApiRow {
  loginId: number | string;
  loginCode?: string | null; // 송연: 계정 login_code = 사번(2026-10-21)
  userId?: number | string;
  userNm?: string;
  departmentNm?: string;
  assigned?: boolean;
  lastLoginAt?: string | null;
}

export interface RoleUserRow {
  id: string;
  loginId: string;
  loginCode: string;
  userNm: string;
  departmentNm: string;
  assigned: boolean;
  lastLoginAt: string;
}

export interface RoleSavePayload {
  roleCode: string;
  roleNm: string;
  roleDc?: string;
  useAt?: string;
}

const toRow = (role: SystemRoleVO): RoleManagementRow => ({
  id: String(role.roleId),
  name: role.roleNm,
  description: role.roleDc ?? '',
  group: role.roleCode,
  menuCount:
    typeof role.userCount === 'number'
      ? role.userCount
      : Number(String(role.userCount ?? '0').replace(/[^0-9-]/g, '') || 0),
  active: role.useAt === 'Y',
  permissions: {
    read: true,
    create: role.useAt === 'Y',
    update: role.useAt === 'Y',
    delete: role.useAt === 'Y',
  },
});

const toRoleUserRow = (user: RoleUserApiRow): RoleUserRow => ({
  id: String(user.loginId ?? user.userId ?? ''),
  loginId: String(user.loginId ?? user.userId ?? ''),
  loginCode: user.loginCode ?? '',
  userNm: user.userNm ?? '',
  departmentNm: user.departmentNm ?? '-',
  assigned: Boolean(user.assigned),
  lastLoginAt: user.lastLoginAt ?? '-',
});

export async function fetchRoleRows(): Promise<RoleManagementRow[]> {
  const result = await apiGet<{ resultList: SystemRoleVO[] }>(
    '/api/v1/system/roles',
  );
  return result.resultList.map(toRow);
}

export async function fetchRoleUserRows(
  roleId: string,
): Promise<{ assignedUsers: RoleUserRow[]; unassignedUsers: RoleUserRow[] }> {
  const result = await apiGet<{
    assignedUsers: RoleUserApiRow[];
    unassignedUsers: RoleUserApiRow[];
  }>(`/api/v1/system/roles/${roleId}/users`);

  return {
    assignedUsers: (result.assignedUsers ?? []).map(toRoleUserRow),
    unassignedUsers: (result.unassignedUsers ?? []).map(toRoleUserRow),
  };
}

export async function createRole(payload: RoleSavePayload): Promise<void> {
  await apiPost('/api/v1/system/roles', { useAt: 'Y', ...payload });
}

export async function updateRole(
  roleId: string,
  payload: RoleSavePayload,
): Promise<void> {
  await apiPut(`/api/v1/system/roles/${roleId}`, { useAt: 'Y', ...payload });
}

export async function assignUserToRole(
  roleId: string,
  loginId: string,
): Promise<void> {
  await apiPost(`/api/v1/system/roles/${roleId}/users`, {
    loginId: Number(loginId),
  });
}

export async function removeUserFromRole(
  roleId: string,
  loginId: string,
): Promise<void> {
  await apiDelete(`/api/v1/system/roles/${roleId}/users/${loginId}`);
}
