export type MenuManagementPageSession = {
  selectedModuleId?: number;
  selectedRoleId: string;
  searchQuery: string;
};

export const initialMenuManagementPageSession: MenuManagementPageSession = {
  selectedModuleId: undefined,
  selectedRoleId: '',
  searchQuery: '',
};

export function isMenuManagementPageSession(
  value: unknown,
): value is MenuManagementPageSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<MenuManagementPageSession>;
  return (
    (candidate.selectedModuleId === undefined ||
      (typeof candidate.selectedModuleId === 'number' &&
        Number.isFinite(candidate.selectedModuleId))) &&
    typeof candidate.selectedRoleId === 'string' &&
    typeof candidate.searchQuery === 'string'
  );
}
