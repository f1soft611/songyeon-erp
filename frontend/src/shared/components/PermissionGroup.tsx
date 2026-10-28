import { Box, Button } from '@mui/material';
import type { ElementType } from 'react';

export type PermissionGroupDefinition = {
  key: string;
  label: string;
  codes: readonly string[];
};

export const DEFAULT_PERMISSION_GROUPS: PermissionGroupDefinition[] = [
  { key: 'read', label: '읽기', codes: ['READ'] },
  { key: 'write', label: '쓰기', codes: ['CREATE', 'UPDATE'] },
  { key: 'delete', label: '삭제', codes: ['DELETE'] },
  { key: 'excel', label: '엑셀', codes: ['EXCEL'] },
];

export function hasPermissionGroup(
  permissionCodes: string[],
  groupCodes: readonly string[],
): boolean {
  return groupCodes.some((code) => permissionCodes.includes(code));
}

export function togglePermissionGroup(
  permissionCodes: string[],
  groupCodes: readonly string[],
  checked: boolean,
): string[] {
  const next = new Set(permissionCodes);

  if (checked) {
    groupCodes.forEach((code) => next.add(code));
    return [...next];
  }

  groupCodes.forEach((code) => next.delete(code));
  return [...next];
}

export type PermissionActionDefinition = {
  key?: string;
  label: string;
  icon?: ElementType;
  visible?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export type PermissionActionGroupDefinition = {
  key: string;
  actions: PermissionActionDefinition[];
};

export type PermissionGroupActionBarProps = {
  groups: PermissionActionGroupDefinition[];
};

export function PermissionGroupActionBar({
  groups,
}: PermissionGroupActionBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {groups.flatMap((group) =>
        group.actions
          .filter((action) => action.visible ?? true)
          .map((action) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={`${group.key}-${action.label}`}
                size="small"
                startIcon={
                  IconComponent ? <IconComponent fontSize="small" /> : undefined
                }
                disabled={action.disabled}
                onClick={() => {
                  void action.onClick?.();
                }}
                sx={{ whiteSpace: 'nowrap' }}
                variant="contained"
              >
                {action.label}
              </Button>
            );
          }),
      )}
    </Box>
  );
}
