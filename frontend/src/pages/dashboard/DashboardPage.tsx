import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import MenuOpenOutlined from '@mui/icons-material/MenuOpenOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../shared/context/AppSettingsContext';
import { logout } from '../../shared/services/authService';
import {
  buildPageContent,
  buildModuleItems,
  defaultPage,
  pageContentMap,
} from './services/dashboardData';
import {
  buildModuleDescriptors,
  emptyUserMenuResponse,
  fetchMyMenus,
  hydrateModuleDescriptors,
} from './services/menuService';
import { fetchModuleRows } from '../settings/system/modules/services/moduleManagement.service';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardContent } from './components/DashboardContent';
import { useDashboardResponsive } from './hooks/useDashboardResponsive';
import type {
  MenuTreeNode,
  ModuleItem,
  UserMenuResponse,
} from './types/dashboard';
import { NotFoundPage } from '../errors/NotFoundPage';
import {
  clearPageSessionState,
  usePageSessionState,
} from '../../shared/hooks/usePageSessionState';

const themeOptions = [
  { value: 'light', label: '밝은 테마' },
  { value: 'dark', label: '다크 테마' },
];

const displayScaleOptions = [
  { value: 0.9, label: '작게' },
  { value: 1, label: '보통' },
  { value: 1.1, label: '조금 크게' },
  { value: 1.2, label: '크게' },
  { value: 1.3, label: '가장 크게' },
  { value: 1, label: '초기화', icon: <ReplayOutlined fontSize="small" /> },
];

const normalizeRoutePath = (path?: string | null): string => {
  const normalized = (path ?? '').trim();
  if (!normalized || normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/, '') || '/';
};

const resolveLegacyRoutePath = (pathname: string): string => {
  if (!pathname || pathname === '/') {
    return '/';
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return '/';
  }

  if (pathname.startsWith('/dashboard/')) {
    return pathname.replace(/^\/dashboard/, '') || '/';
  }

  return pathname;
};

const getModuleRoutePath = (module: ModuleItem): string =>
  normalizeRoutePath(module.path ?? `/${module.id}`);

const getMenuRoutePath = (module: ModuleItem, menuId: string): string => {
  const modulePath = getModuleRoutePath(module);
  const directMatch =
    module.menus.find((menu) => menu.id === menuId)?.path ??
    findMenuPath(module.tree, menuId)?.node.path;

  if (directMatch) {
    return normalizeRoutePath(directMatch);
  }

  return `${modulePath === '/' ? '' : modulePath}/${menuId}` || '/';
};

function findMenuPath(
  nodes: MenuTreeNode[],
  menuId: string,
  parentIds: string[] = [],
  parentNames: string[] = [],
):
  | {
      node: MenuTreeNode;
      parentIds: string[];
      parentNames: string[];
    }
  | undefined {
  for (const node of nodes) {
    if (node.id === menuId) {
      return { node, parentIds, parentNames };
    }

    const childPath = node.children
      ? findMenuPath(
          node.children,
          menuId,
          [...parentIds, node.id],
          [...parentNames, node.name],
        )
      : undefined;

    if (childPath) {
      return childPath;
    }
  }

  return undefined;
}

type RecentMenuEntry = {
  menuId: string;
  moduleId: string;
  moduleName?: string;
  breadcrumbPath?: string;
  label: string;
  path: string;
  visitedAt: number;
};

const RECENT_MENU_SESSION_KEY = 'songyeon-erp:recent-menu-history';
const COMMON_CODE_PAGE_SESSION_KEY = 'songyeon-erp:page:common-code-management';
const RECENT_MENU_LIMIT = 5;

const writeRecentMenus = (items: RecentMenuEntry[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RECENT_MENU_SESSION_KEY,
      JSON.stringify(items),
    );
  } catch {
    // Ignore storage errors; the user still gets the current page flow.
  }
};

function DashboardPage() {
  console.log('DashboardPage mount', window.location.pathname);
  const navigate = useNavigate();
  const [moduleItems, setModuleItems] = useState<ModuleItem[]>([]);
  const [profile, setProfile] = useState<UserMenuResponse['user']>(
    emptyUserMenuResponse.user,
  );
  const [menusLoading, setMenusLoading] = useState(true);
  const [menusError, setMenusError] = useState(false);
  const [menusReloadToken, setMenusReloadToken] = useState(0);
  const lastRecordedMenuRef = useRef('');
  const {
    state: recentMenuState,
    setState: setRecentMenuState,
    resetState: resetRecentMenuState,
  } = usePageSessionState<RecentMenuEntry[]>(RECENT_MENU_SESSION_KEY, []);
  const defaultModule = moduleItems[0];
  const defaultMenuId = defaultModule?.menus[0]?.id ?? '';
  const emptyModule: ModuleItem = {
    id: '',
    name: '접근 가능한 메뉴 없음',
    icon: null,
    tree: [],
    menus: [],
  };

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    // 로그인 직후 토큰 갱신 등과 겹치는 순간적인 네트워크 오류를 흡수하기 위해 1회 재시도한다.
    const loadOnce = () => Promise.all([fetchMyMenus(), fetchModuleRows()]);

    setMenusLoading(true);
    setMenusError(false);

    loadOnce()
      .catch(async (error) => {
        if (cancelled) {
          throw error;
        }
        await wait(500);
        return loadOnce();
      })
      .then(([response, moduleRows]) => {
        if (cancelled) {
          return;
        }

        setProfile(response.user ?? emptyUserMenuResponse.user);
        const sourceModules = buildModuleDescriptors(response);
        setModuleItems(
          buildModuleItems(hydrateModuleDescriptors(sourceModules, moduleRows)),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMenusError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMenusLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [menusReloadToken]);
  const location = useLocation();
  const effectivePath = resolveLegacyRoutePath(location.pathname);
  const theme = useTheme();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [displayScaleMenuAnchor, setDisplayScaleMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<HTMLElement | null>(null);
  const { themeMode, setThemeMode, displayScale, setDisplayScale } =
    useAppSettings();
  const {
    isMobile,
    isMenuPanelCollapsed,
    isMobileMenuOpen,
    contentRef,
    toggleMenuPanel,
    closeMobileMenu,
  } = useDashboardResponsive();
  const pathSegments = effectivePath.split('/').filter(Boolean);
  const routeModuleId = pathSegments[0] ?? defaultModule?.id ?? '';
  const routeMenuId =
    pathSegments.length > 1
      ? pathSegments[pathSegments.length - 1]
      : defaultMenuId;

  const selectedModuleId = moduleItems.some(
    (module) =>
      module.id === routeModuleId ||
      normalizeRoutePath(module.path ?? `/${module.id}`) ===
        normalizeRoutePath(effectivePath),
  )
    ? routeModuleId
    : (defaultModule?.id ?? '');

  const selectedModule =
    moduleItems.find((module) => module.id === selectedModuleId) ??
    moduleItems[0] ??
    emptyModule;

  const selectedMenuPath = findMenuPath(selectedModule.tree, routeMenuId);
  const selectedMenu =
    selectedMenuPath && !selectedMenuPath.node.children?.length
      ? selectedMenuPath
      : undefined;
  const fallbackMenu = selectedModule.menus[0] ??
    defaultModule?.menus[0] ?? {
      id: defaultMenuId || 'empty-access',
      name: selectedModule.name,
      pageKey: defaultMenuId || 'empty-access',
    };
  const fallbackMenuPath = findMenuPath(selectedModule.tree, fallbackMenu.id);
  const selectedMenuId = selectedMenu?.node.id ?? fallbackMenu.id;
  const expandedItemIds =
    selectedMenu?.parentIds ?? fallbackMenuPath?.parentIds ?? [];
  const currentMenu = selectedMenu?.node ?? fallbackMenu;
  const currentPageKey = currentMenu.pageKey ?? currentMenu.id ?? defaultMenuId;
  const currentParentNames =
    selectedMenu?.parentNames ?? fallbackMenuPath?.parentNames ?? [];
  const breadcrumbItems = [
    selectedModule.name,
    ...currentParentNames,
    currentMenu.name,
  ];
  const recentBreadcrumbItems =
    selectedModule.id === 'groupware' && currentMenu.id === 'notice'
      ? [selectedModule.name, '커뮤니티', currentMenu.name]
      : breadcrumbItems;

  const isValidDashboardRoute = useMemo(() => {
    const normalizedPath = normalizeRoutePath(effectivePath);
    if (normalizedPath === '/') {
      return true;
    }

    const validPaths = new Set<string>(['/']);
    moduleItems.forEach((module) => {
      validPaths.add(normalizeRoutePath(module.path ?? `/${module.id}`));

      const collectTreePaths = (nodes: MenuTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.path) {
            validPaths.add(normalizeRoutePath(node.path));
          }
          if (node.children?.length) {
            collectTreePaths(node.children);
          }
        });
      };

      collectTreePaths(module.tree);
      module.menus.forEach((menu) => {
        if (menu.path) {
          validPaths.add(normalizeRoutePath(menu.path));
        }
      });
    });

    return validPaths.has(normalizedPath);
  }, [effectivePath, moduleItems]);

  useEffect(() => {
    const pathname = location.pathname;
    if (!defaultModule) {
      return;
    }

    const isRootDashboardAlias =
      pathname === '/' ||
      pathname === '/dashboard' ||
      pathname === '/dashboard/';

    if (isRootDashboardAlias) {
      const firstMenu = defaultModule.menus[0];
      const nextPath =
        (firstMenu?.path ??
          getMenuRoutePath(defaultModule, firstMenu?.id ?? defaultMenuId)) ||
        getModuleRoutePath(defaultModule);

      if (nextPath !== pathname) {
        navigate(nextPath, { replace: true });
      }
    }
  }, [defaultModule, defaultMenuId, location.pathname, navigate]);

  const isDarkTheme = themeMode === 'dark';

  const handleModuleChange = (moduleId: string) => {
    const nextModule =
      moduleItems.find((module) => module.id === moduleId) ?? moduleItems[0];
    if (!nextModule) {
      return;
    }

    const nextMenu = nextModule.menus[0];
    const nextPath =
      nextMenu?.path ??
      (nextMenu
        ? getMenuRoutePath(nextModule, nextMenu.id)
        : getModuleRoutePath(nextModule));
    navigate(nextPath);
  };

  const handleMenuSelect = (menuId: string) => {
    const targetPath = getMenuRoutePath(selectedModule, menuId);
    navigate(targetPath);
  };

  const handleRecentMenuSelect = (path: string) => {
    if (path) {
      navigate(path);
    }
  };

  const handleProfileAction = (action: 'profile' | 'security' | 'logout') => {
    if (action === 'logout') {
      handleLogout();
      return;
    }

    if (action === 'profile') {
      navigate('/dashboard/profile');
      return;
    }

    navigate('/dashboard/security');
  };

  const handleLogout = () => {
    resetRecentMenuState();
    clearPageSessionState(COMMON_CODE_PAGE_SESSION_KEY);
    logout();
    navigate('/login', { replace: true });
  };

  const profileName = profile.name?.trim() || profile.userId || '사용자';
  const profileDepartment = profile.departmentName?.trim() || '부서 정보 없음';
  const profileLevel = profile.levelName?.trim() || '직급 정보 없음';
  const profileEmail = profile.email?.trim() || '이메일 정보 없음';
  const profileInitial = profileName.charAt(0).toUpperCase() || 'A';
  const profileAvatarColor = '#2563eb';

  const handleOpenThemeMenu = (event: MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleOpenDisplayScaleMenu = (event: MouseEvent<HTMLElement>) => {
    setDisplayScaleMenuAnchor(event.currentTarget);
  };

  const handleThemeChange = (value: string) => {
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    setThemeMenuAnchor(null);
  };

  const handleDisplayScaleChange = (value: number | string) => {
    const nextScale = value === 'reset' ? 1 : Number(value);
    setDisplayScale(nextScale);
    setDisplayScaleMenuAnchor(null);
  };

  const hasAccessibleMenu = moduleItems.length > 0;

  useEffect(() => {
    if (menusLoading || !hasAccessibleMenu) {
      return;
    }

    setRecentMenuState((previousEntries) => {
      const validEntries = previousEntries
        .filter(
          (entry) =>
            entry.menuId !== 'empty-access' &&
            entry.label !== '접근 가능한 메뉴 없음',
        )
        .map((entry) => {
          if (entry.moduleId !== 'groupware' || entry.menuId !== 'notice') {
            return entry;
          }

          const expectedBreadcrumb = `${entry.moduleName || '그룹웨어'} > 커뮤니티 > ${entry.label}`;
          return entry.breadcrumbPath === expectedBreadcrumb
            ? entry
            : { ...entry, breadcrumbPath: expectedBreadcrumb };
        });

      return validEntries.length === previousEntries.length
        ? validEntries.every((entry, index) => entry === previousEntries[index])
          ? previousEntries
          : validEntries
        : validEntries;
    });
  }, [hasAccessibleMenu, menusLoading, setRecentMenuState]);

  useEffect(() => {
    if (
      menusLoading ||
      !hasAccessibleMenu ||
      !selectedModule.id ||
      selectedMenuId === 'empty-access'
    ) {
      return;
    }

    const nextPath = normalizeRoutePath(
      location.pathname || getMenuRoutePath(selectedModule, selectedMenuId),
    );
    const nextSignature = `${selectedModuleId}:${selectedMenuId}:${nextPath}`;

    if (
      !selectedMenuId ||
      !nextPath ||
      lastRecordedMenuRef.current === nextSignature
    ) {
      return;
    }

    lastRecordedMenuRef.current = nextSignature;

    const nextEntry: RecentMenuEntry = {
      menuId: selectedMenuId,
      moduleId: selectedModuleId,
      moduleName: selectedModule.name,
      breadcrumbPath: recentBreadcrumbItems.join(' > '),
      label: currentMenu.name,
      path: nextPath,
      visitedAt: Date.now(),
    };

    setRecentMenuState((previousEntries) => {
      const normalizedPrevious = Array.isArray(previousEntries)
        ? previousEntries.filter(
            (entry) => entry && typeof entry.menuId === 'string',
          )
        : [];

      const nextEntries = [
        nextEntry,
        ...normalizedPrevious.filter(
          (entry) => entry.menuId !== nextEntry.menuId,
        ),
      ].slice(0, RECENT_MENU_LIMIT);

      const lookup = new Map<string, RecentMenuEntry>();
      nextEntries.forEach((entry) => {
        if (entry && entry.menuId) {
          lookup.set(entry.menuId, entry);
        }
      });

      return Array.from(lookup.values()).sort(
        (left, right) => right.visitedAt - left.visitedAt,
      );
    });
  }, [
    currentMenu.id,
    currentMenu.name,
    hasAccessibleMenu,
    location.pathname,
    menusLoading,
    selectedMenuId,
    selectedModule,
    selectedModuleId,
    setRecentMenuState,
  ]);

  useEffect(() => {
    writeRecentMenus(recentMenuState);
  }, [recentMenuState]);

  // 송연(2026-10-23): 화면 설명은 그 메뉴의 설명(메뉴관리) → 그 화면 키의 기본 설명 순서로만 쓴다.
  // S_ERP 는 둘 다 없으면 첫 모듈 첫 메뉴(그룹웨어 종합현황) 설명을 빌려 써서 다른 화면에 엉뚱한 설명이 보였다. 이제는 비운다
  const content = useMemo(() => {
    const baseContent = pageContentMap[currentPageKey] ?? {
      ...defaultPage,
      description: '',
    };
    return buildPageContent(baseContent, currentMenu);
  }, [currentMenu, currentPageKey]);

  const isRootDashboardAlias =
    normalizeRoutePath(effectivePath) === '/' ||
    normalizeRoutePath(effectivePath) === '/dashboard';

  if (!menusLoading && !isValidDashboardRoute && !isRootDashboardAlias) {
    return <NotFoundPage />;
  }

  if (menusError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        <Typography variant="body1">
          메뉴 정보를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해
          주세요.
        </Typography>
        <IconButton
          aria-label="메뉴 다시 불러오기"
          onClick={() => setMenusReloadToken((token) => token + 1)}
        >
          <ReplayOutlined />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        '--dashboard-header-height': '58px',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {menusLoading ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={34} />
        </Box>
      ) : (
        <>
          <DashboardSidebar
            moduleItems={moduleItems}
            selectedModuleId={selectedModuleId}
            selectedModule={selectedModule}
            expandedItemIds={expandedItemIds}
            selectedMenuId={selectedMenuId}
            recentMenuItems={recentMenuState}
            onModuleChange={handleModuleChange}
            onMenuSelect={handleMenuSelect}
            onRecentMenuSelect={handleRecentMenuSelect}
            isMenuPanelCollapsed={isMenuPanelCollapsed}
            isMobile={isMobile}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMenu={toggleMenuPanel}
            onCloseMobileMenu={closeMobileMenu}
          />

          <Box
            ref={contentRef}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 송연: 역할이 없어도 로그인은 되므로(2026-10-21) 상단 바(프로필 · 로그아웃)는 메뉴가 없어도 그린다.
                S_ERP 는 역할 없는 계정의 로그인을 막아 메뉴가 있을 때만 그린다 */}
            <>
                <AppBar
                  position="sticky"
                  elevation={0}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    height: 'var(--dashboard-header-height)',
                    boxSizing: 'border-box',
                  }}
                >
                  <Box
                    sx={{
                      px: { xs: 1, md: 3 },
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        aria-label={
                          isMobile
                            ? isMobileMenuOpen
                              ? '메뉴 닫기'
                              : '메뉴 열기'
                            : isMenuPanelCollapsed
                              ? '메뉴 패널 펼치기'
                              : '메뉴 패널 접기'
                        }
                        aria-expanded={
                          isMobile ? isMobileMenuOpen : !isMenuPanelCollapsed
                        }
                        onClick={toggleMenuPanel}
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        {isMobile && isMobileMenuOpen ? (
                          <MenuOpenOutlined fontSize="small" />
                        ) : isMobile || isMenuPanelCollapsed ? (
                          <MenuOutlined fontSize="small" />
                        ) : (
                          <MenuOpenOutlined fontSize="small" />
                        )}
                      </IconButton>
                      <Typography
                        variant="h6"
                        component="h1"
                        sx={{ fontWeight: 700 }}
                      >
                        {hasAccessibleMenu ? currentMenu.name : ''}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        ml: 'auto',
                        minWidth: 0,
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Tooltip title="테마 설정">
                        <IconButton
                          aria-label="테마 설정"
                          aria-controls={
                            themeMenuAnchor ? 'theme-settings-menu' : undefined
                          }
                          aria-haspopup="menu"
                          aria-expanded={themeMenuAnchor ? 'true' : undefined}
                          onClick={handleOpenThemeMenu}
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          {isDarkTheme ? (
                            <DarkModeOutlined fontSize="small" />
                          ) : (
                            <LightModeOutlined fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Menu
                        id="theme-settings-menu"
                        anchorEl={themeMenuAnchor}
                        open={Boolean(themeMenuAnchor)}
                        onClose={() => setThemeMenuAnchor(null)}
                      >
                        {themeOptions.map((option) => (
                          <MenuItem
                            key={option.value}
                            selected={themeMode === option.value}
                            onClick={() => handleThemeChange(option.value)}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Menu>
                      <Tooltip title="화면크기 설정">
                        <IconButton
                          aria-label="화면크기 설정"
                          aria-controls={
                            displayScaleMenuAnchor
                              ? 'display-scale-settings-menu'
                              : undefined
                          }
                          aria-haspopup="menu"
                          aria-expanded={
                            displayScaleMenuAnchor ? 'true' : undefined
                          }
                          onClick={handleOpenDisplayScaleMenu}
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          <TuneOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Menu
                        id="display-scale-settings-menu"
                        anchorEl={displayScaleMenuAnchor}
                        open={Boolean(displayScaleMenuAnchor)}
                        onClose={() => setDisplayScaleMenuAnchor(null)}
                      >
                        {displayScaleOptions.map((option) => (
                          <MenuItem
                            key={`${option.label}-${String(option.value)}`}
                            selected={
                              Number(option.value) === Number(displayScale)
                            }
                            onClick={() =>
                              handleDisplayScaleChange(option.value)
                            }
                          >
                            {option.icon ? (
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                {option.icon}
                              </ListItemIcon>
                            ) : null}
                            {option.label}
                          </MenuItem>
                        ))}
                      </Menu>
                      <IconButton
                        aria-label="notifications"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        <NotificationsOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="프로필 메뉴 열기"
                        onClick={(event) =>
                          setProfileMenuAnchor(event.currentTarget)
                        }
                        sx={{
                          color: theme.palette.text.secondary,
                          p: 0.5,
                          borderRadius: '50%',
                        }}
                      >
                        <Avatar
                          src={profile.profileImage || undefined}
                          data-testid="profile-avatar"
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            bgcolor: profileAvatarColor,
                          }}
                        >
                          {profileInitial}
                        </Avatar>
                      </IconButton>
                      <Menu
                        anchorEl={profileMenuAnchor}
                        open={Boolean(profileMenuAnchor)}
                        onClose={() => setProfileMenuAnchor(null)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        slotProps={{
                          paper: {
                            sx: {
                              mt: 1,
                              width: 'min(300px, calc(100vw - 24px))',
                              borderRadius: 2.5,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow:
                                theme.palette.mode === 'dark'
                                  ? '0 16px 36px rgba(0, 0, 0, 0.38)'
                                  : '0 16px 36px rgba(15, 23, 42, 0.16)',
                              overflow: 'hidden',
                            },
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2,
                            py: 1.75,
                          }}
                        >
                          <Avatar
                            src={profile.profileImage || undefined}
                            data-testid="profile-avatar"
                            sx={{
                              width: 42,
                              height: 42,
                              bgcolor: profileAvatarColor,
                              fontWeight: 800,
                            }}
                          >
                            {profileInitial}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                lineHeight: 1.25,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {profileName}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: theme.palette.text.secondary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {profileDepartment} · {profileLevel}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.text.secondary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {profileEmail}
                            </Typography>
                          </Box>
                        </Box>
                        <Divider />
                        <MenuItem
                          onClick={() => {
                            handleProfileAction('profile');
                            setProfileMenuAnchor(null);
                          }}
                        >
                          <ListItemIcon>
                            <ManageAccountsOutlined fontSize="small" />
                          </ListItemIcon>
                          내 정보 관리
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleProfileAction('security');
                            setProfileMenuAnchor(null);
                          }}
                        >
                          <ListItemIcon>
                            <SecurityOutlined fontSize="small" />
                          </ListItemIcon>
                          보안 설정
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleProfileAction('logout');
                            setProfileMenuAnchor(null);
                          }}
                        >
                          <ListItemIcon>
                            <LogoutOutlined fontSize="small" />
                          </ListItemIcon>
                          로그아웃
                        </MenuItem>
                      </Menu>
                    </Box>
                  </Box>
                </AppBar>

                {hasAccessibleMenu ? (
                <DashboardContent
                  selectedModule={selectedModule}
                  currentMenuName={currentMenu.name}
                  currentPageKey={currentPageKey}
                  breadcrumbItems={breadcrumbItems}
                  content={content}
                  selectedMenuPermissions={currentMenu.permissions}
                  isTenantAdmin={[
                    'TENANT_ADMIN',
                    'PLATFORM_ADMIN',
                    'ADMIN',
                  ].includes((profile.roleName ?? '').trim().toUpperCase())}
                />
                ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  접근 가능한 메뉴가 없습니다.
                </Typography>
              </Box>
                )}
            </>
          </Box>
        </>
      )}
    </Box>
  );
}

export default DashboardPage;
