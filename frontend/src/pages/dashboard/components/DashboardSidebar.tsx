import { Box, Drawer, useTheme } from '@mui/material';
import type { ModuleItem } from '../types/dashboard';
import { DashboardMenuTree } from './DashboardMenuTree';
import { DashboardModuleSection } from './DashboardModuleSection';

type RecentMenuEntry = {
  menuId: string;
  moduleId: string;
  breadcrumbPath?: string;
  label: string;
  path: string;
  visitedAt: number;
};

type DashboardSidebarProps = {
  moduleItems: ModuleItem[];
  selectedModuleId: string;
  selectedModule: ModuleItem;
  expandedItemIds: string[];
  selectedMenuId: string;
  recentMenuItems?: RecentMenuEntry[];
  onModuleChange: (moduleId: string) => void;
  onMenuSelect: (menuId: string) => void;
  onRecentMenuSelect?: (path: string) => void;
  isMenuPanelCollapsed: boolean;
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMobileMenu: () => void;
};

export function DashboardSidebar({
  moduleItems,
  selectedModuleId,
  selectedModule,
  expandedItemIds,
  selectedMenuId,
  recentMenuItems = [],
  onModuleChange,
  onMenuSelect,
  onRecentMenuSelect,
  isMenuPanelCollapsed,
  isMobile,
  isMobileMenuOpen,
  onToggleMenu,
  onCloseMobileMenu,
}: DashboardSidebarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexShrink: 0 }}>
      <DashboardModuleSection
        moduleItems={moduleItems}
        selectedModuleId={selectedModuleId}
        onModuleChange={onModuleChange}
      />

      {(!isMenuPanelCollapsed || (isMobile && isMobileMenuOpen)) && (
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? isMobileMenuOpen : true}
          onClose={onCloseMobileMenu}
          sx={{
            width: isMobile ? 0 : 288,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              position: isMobile ? 'fixed' : 'relative',
              width: isMobile ? 'min(280px, calc(100vw - 92px))' : 288,
              bgcolor: isDark ? '#0f172a' : '#f8fafc',
              color: isDark ? '#e2e8f0' : '#0f172a',
              borderRight: `1px solid ${theme.palette.divider}`,
              boxSizing: 'border-box',
              display: 'flex',
              boxShadow: isDark
                ? 'inset 0 0 0 1px rgba(148,163,184,0.08)'
                : 'none',
            },
          }}
        >
          <DashboardMenuTree
            selectedModule={selectedModule}
            expandedItemIds={expandedItemIds}
            selectedMenuId={selectedMenuId}
            recentMenuItems={recentMenuItems}
            onMenuSelect={onMenuSelect}
            onRecentMenuSelect={onRecentMenuSelect}
            onToggleMenu={onToggleMenu}
          />
        </Drawer>
      )}
    </Box>
  );
}
