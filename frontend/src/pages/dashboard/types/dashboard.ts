import type { ReactNode } from 'react';

export type MenuItem = {
  id: string;
  name: string;
  pageKey: string;
  path?: string;
  description?: string;
  permissions?: MenuPermission;
};

export type MenuPermission = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  excel?: boolean;
};

export type MenuNode = {
  menuId: number;
  parentMenuId: number | null;
  name: string;
  description?: string;
  icon?: string;
  path?: string;
  permissions?: MenuPermission;
  children?: MenuNode[];
};

export type UserMenuResponse = {
  user: {
    userId: string;
    roles: string[];
    name?: string | null;
    email?: string | null;
    profileImage?: string | null;
    departmentName?: string | null;
    levelId?: number | null;
    levelCode?: string | null;
    levelName?: string | null;
    groupName?: string | null;
    roleName?: string | null;
  };
  menus: MenuNode[];
};

export type MenuTreeNode = {
  id: string;
  name: string;
  description?: string;
  path?: string;
  menuId?: number;
  pageKey?: string;
  permissions?: MenuPermission;
  children?: MenuTreeNode[];
};

export type ModuleItem = {
  id: string;
  name: string;
  icon: ReactNode;
  path?: string;
  tree: MenuTreeNode[];
  menus: MenuItem[];
};

export type ContentCard = {
  label: string;
  value: string;
};

export type ContentItem = {
  title: string;
  meta: string;
  status?: string;
};

export type PageContent = {
  title: string;
  description: string;
  cards: ContentCard[];
  items: ContentItem[];
  kind?: 'summary' | 'roles' | 'menus';
};
