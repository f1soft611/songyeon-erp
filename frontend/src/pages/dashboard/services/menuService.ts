import { apiGet } from '../../../shared/services/apiClient';
import type {
  MenuItem,
  MenuNode,
  MenuPermission,
  MenuTreeNode,
  UserMenuResponse,
} from '../types/dashboard';

export const emptyUserMenuResponse: UserMenuResponse = {
  user: {
    userId: '',
    roles: [],
    name: null,
    email: null,
    profileImage: null,
    departmentName: null,
    levelId: null,
    levelCode: null,
    levelName: null,
    groupName: null,
    roleName: null,
  },
  menus: [],
};

export type ModuleDescriptor = {
  id: string;
  name: string;
  iconName: string;
  path?: string;
  tree: MenuTreeNode[];
  menus: MenuItem[];
};

const pathSegments = (path?: string): string[] =>
  (path ?? '').split('/').filter(Boolean);

const toModuleId = (node: MenuNode): string =>
  pathSegments(node.path)[0] ?? `module-${node.menuId}`;

const toNodeId = (node: MenuNode): string =>
  pathSegments(node.path).at(-1) ?? `menu-${node.menuId}`;

const toTreeNode = (node: MenuNode): MenuTreeNode => {
  const id = toNodeId(node);
  const children = node.children?.map(toTreeNode);
  const fallbackPageKey = id;

  return {
    id,
    menuId: node.menuId,
    name: node.name,
    ...(node.description ? { description: node.description } : {}),
    ...(node.path ? { path: node.path } : {}),
    ...(children?.length ? { children } : { pageKey: fallbackPageKey }),
    ...(node.permissions ? { permissions: node.permissions } : {}),
  };
};

const hasEffectiveMenuPermission = (permissions?: MenuPermission): boolean =>
  Boolean(
    permissions &&
    (permissions.read ||
      permissions.create ||
      permissions.update ||
      permissions.delete ||
      permissions.excel),
  );

const filterVisibleMenuNodes = (nodes: MenuNode[] = []): MenuNode[] =>
  nodes.flatMap((node) => {
    const filteredChildren = filterVisibleMenuNodes(node.children ?? []);

    if (filteredChildren.length > 0) {
      return [{ ...node, children: filteredChildren }];
    }

    if (hasEffectiveMenuPermission(node.permissions)) {
      return [{ ...node }];
    }

    return [];
  });

const flattenMenuTree = (nodes: MenuTreeNode[]): MenuItem[] =>
  nodes.flatMap((node) => {
    if (node.children?.length) {
      return flattenMenuTree(node.children);
    }

    if (!hasEffectiveMenuPermission(node.permissions)) {
      return [];
    }

    const pageKey = node.pageKey ?? node.id;
    return [
      {
        id: node.id,
        name: node.name,
        pageKey,
        ...(node.path ? { path: node.path } : {}),
        ...(node.description ? { description: node.description } : {}),
      },
    ];
  });

export const buildModuleDescriptors = (
  response: UserMenuResponse,
): ModuleDescriptor[] =>
  response.menus
    .map((root) => {
      const tree = filterVisibleMenuNodes(root.children ?? []).map(toTreeNode);

      return {
        id: toModuleId(root),
        name: root.name,
        iconName: root.icon ?? 'Settings',
        path: root.path,
        tree,
        menus: flattenMenuTree(tree),
      };
    })
    .filter(
      (descriptor) => descriptor.tree.length > 0 || descriptor.menus.length > 0,
    );

const normalizeModulePath = (path?: string | null): string =>
  (path ?? '').trim().replace(/\/+$/, '').toLowerCase();

export const hydrateModuleDescriptors = (
  descriptors: ModuleDescriptor[],
  moduleRows: Array<{
    moduleName?: string;
    moduleCode?: string;
    iconName?: string;
    moduleUrl?: string;
  }>,
): ModuleDescriptor[] =>
  descriptors.map((descriptor) => {
    const match =
      moduleRows.find(
        (row) =>
          normalizeModulePath(row.moduleUrl) ===
          normalizeModulePath(descriptor.path ?? `/${descriptor.id}`),
      ) ??
      moduleRows.find(
        (row) =>
          (row.moduleName ?? '').trim().toLowerCase() ===
          descriptor.name.trim().toLowerCase(),
      ) ??
      moduleRows.find(
        (row) =>
          (row.moduleCode ?? '').trim().toLowerCase() ===
          descriptor.id.trim().toLowerCase(),
      );

    if (!match) {
      return descriptor;
    }

    return {
      ...descriptor,
      name: (match.moduleName ?? descriptor.name).trim() || descriptor.name,
      iconName:
        (match.iconName ?? descriptor.iconName).trim() || descriptor.iconName,
    };
  });

export const moduleDescriptors: ModuleDescriptor[] = [];

const collectPermissions = (
  moduleId: string,
  nodes: MenuTreeNode[],
  target: Map<string, MenuPermission>,
) => {
  nodes.forEach((node) => {
    if (node.permissions) {
      target.set(`${moduleId}:${node.id}`, node.permissions);
    }

    if (node.children?.length) {
      collectPermissions(moduleId, node.children, target);
    }
  });
};

export const buildMenuPermissionMap = (
  descriptors: ModuleDescriptor[],
): Map<string, MenuPermission> => {
  const map = new Map<string, MenuPermission>();
  descriptors.forEach((module) => {
    collectPermissions(module.id, module.tree, map);
  });
  return map;
};

export const menuPermissionMap: Map<string, MenuPermission> =
  buildMenuPermissionMap(moduleDescriptors);

export const getMenuPermission = (
  moduleId: string,
  menuId: string,
): MenuPermission | undefined => menuPermissionMap.get(`${moduleId}:${menuId}`);

/**
 * 로그인 사용자 기준 모듈-메뉴 트리를 백엔드에서 조회한다.
 * 실패 시 예외를 그대로 던지므로, 호출부가 네트워크 오류와 빈 메뉴를 구분해서 처리해야 한다.
 */
export const fetchMyMenus = async (): Promise<UserMenuResponse> =>
  apiGet<UserMenuResponse>('/api/v1/menus/my');
