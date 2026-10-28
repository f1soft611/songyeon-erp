import { useEffect, useState } from 'react';
import { moduleItems } from '../services/dashboardData';
import type { MenuItem } from '../types/dashboard';

export const useDashboardSelection = () => {
  const [selectedModuleId, setSelectedModuleId] = useState('groupware');
  const selectedModule =
    moduleItems.find((module) => module.id === selectedModuleId) ??
    moduleItems[0];

  const [selectedParentId, setSelectedParentId] = useState(
    selectedModule.tree[0]?.id ?? 'groupware-main',
  );

  const [selectedMenuId, setSelectedMenuId] = useState(
    selectedModule.tree[0]?.children?.[0]?.id ?? 'approval',
  );

  useEffect(() => {
    const nextModule =
      moduleItems.find((module) => module.id === selectedModuleId) ??
      moduleItems[0];

    const nextParent = nextModule.tree[0];
    setSelectedParentId(nextParent?.id ?? `${selectedModuleId}-main`);
    setSelectedMenuId(nextParent?.children?.[0]?.id ?? 'approval');
  }, [selectedModuleId]);

  const currentParent =
    selectedModule.tree.find((node) => node.id === selectedParentId) ??
    selectedModule.tree[0];

  const currentMenu: MenuItem = (currentParent?.children?.find(
    (menu) => menu.id === selectedMenuId && Boolean(menu.pageKey),
  ) as MenuItem | undefined) ??
    (currentParent?.children?.find((menu) => Boolean(menu.pageKey)) as
      | MenuItem
      | undefined) ??
    selectedModule.menus[0] ?? {
      id: 'approval',
      name: '전자결재',
      pageKey: 'approval',
    };

  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  return {
    selectedModuleId,
    selectedModule,
    selectedParentId,
    selectedMenuId,
    currentParent,
    currentMenu,
    handleModuleChange,
    setSelectedParentId,
    setSelectedMenuId,
  };
};
