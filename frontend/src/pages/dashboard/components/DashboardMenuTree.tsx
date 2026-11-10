import {
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  Typography,
  useTheme,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import StarOutlined from '@mui/icons-material/StarOutlined';
import StarOutlineOutlined from '@mui/icons-material/StarOutlineOutlined';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import type { MenuTreeNode, ModuleItem } from '../types/dashboard';
import type { MenuFavoritesResponse, FavoriteMenu } from '../types/menuFavorite.types';
import { useState, type MouseEvent } from 'react';
import {
  createMenuFavorite,
  createMenuFavoriteFolder,
  deleteMenuFavorite,
  deleteMenuFavoriteFolder,
  moveMenuFavorite,
  renameMenuFavoriteFolder,
} from '../services/menuFavorite.service';
import {
  MenuFavoriteContextMenu,
  type FavoriteContextTarget,
} from './MenuFavoriteContextMenu';
import { MenuFavoriteEditDialog } from './MenuFavoriteEditDialog';

type RecentMenuEntry = {
  menuId: string;
  moduleId: string;
  moduleName?: string;
  breadcrumbPath?: string;
  label: string;
  path: string;
  visitedAt: number;
};

type DashboardMenuTreeProps = {
  selectedModule: ModuleItem;
  expandedItemIds: string[];
  selectedMenuId: string;
  recentMenuItems?: RecentMenuEntry[];
  favorites?: MenuFavoritesResponse;
  onFavoritesRefresh?: () => Promise<void>;
  onMenuSelect: (menuId: string) => void;
  onRecentMenuSelect?: (path: string) => void;
  onToggleMenu?: () => void;
  onFavoritesError?: (message: string) => void;
  onFavoritesMore?: () => void;
};

const formatRecentMenuTime = (visitedAt: number) => {
  const diffMs = Date.now() - visitedAt;

  if (diffMs < 60 * 1000) {
    return '방금';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return `${days}일 전`;
};

export function DashboardMenuTree({
  selectedModule,
  expandedItemIds,
  selectedMenuId,
  recentMenuItems = [],
  favorites = { folders: [], favorites: [] },
  onFavoritesRefresh,
  onMenuSelect,
  onRecentMenuSelect,
  onToggleMenu,
  onFavoritesError,
  onFavoritesMore,
}: DashboardMenuTreeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const panelBg = isDark ? '#111827' : '#f7f9fc';
  const softBg = isDark ? '#0f172a' : '#f1f5f9';
  const expandedItemKey = expandedItemIds.join(',');
  const treeStateKey = `${selectedModule.id}:${expandedItemKey}:${selectedMenuId}`;
  const [contextTarget, setContextTarget] = useState<FavoriteContextTarget | null>(null);
  const [contextPosition, setContextPosition] = useState<{ top: number; left: number } | null>(null);
  const [localError, setLocalError] = useState('');
  const [editingFavorite, setEditingFavorite] = useState<{
    menuId: number;
    menuName: string;
    menuUrl: string;
    favorite: FavoriteMenu;
  } | null>(null);
  const runFavoriteAction = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    try {
      const result = await action();
      await onFavoritesRefresh?.();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '즐겨찾기 작업에 실패했습니다.';
      if (onFavoritesError) {
        onFavoritesError(message);
      } else {
        setLocalError(message);
      }
      return undefined;
    }
  };
  const openFavoriteEditor = (
    target: Extract<FavoriteContextTarget, { kind: 'available-menu' }>,
  ) => {
    if (!target.favorite) return;
    setEditingFavorite({
      menuId: target.menuId,
      menuName: target.label,
      menuUrl: target.path,
      favorite: target.favorite,
    });
  };
  const openContextMenu = (event: MouseEvent<HTMLElement>, target: FavoriteContextTarget) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextTarget(target);
    setContextPosition(
      event.type === 'contextmenu'
        ? { top: event.clientY, left: event.clientX }
        : { top: rect.bottom, left: rect.right },
    );
  };
  const favoritesByMenuId = new Map<number, FavoriteMenu>();
  favorites.favorites.forEach((favorite) => favoritesByMenuId.set(favorite.menuId, favorite));

  const renderMenuNode = (node: MenuTreeNode) => {
    const hasChildren = Boolean(node.children?.length);
    const isSelected = selectedMenuId === node.id;
    const isEligible =
      !hasChildren &&
      Boolean(node.path) &&
      node.menuId != null &&
      node.permissions?.read === true;
    const favorite = node.menuId == null ? undefined : favoritesByMenuId.get(node.menuId);
    const menuTarget: FavoriteContextTarget | null = isEligible && node.menuId != null
      ? {
          kind: 'available-menu',
          menuId: node.menuId,
          label: node.name,
          path: node.path!,
          ...(favorite ? { favorite } : {}),
        }
      : null;

    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box
            sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
          >
            <Box component="span" sx={{ flex: 1 }}>{node.name}</Box>
            {menuTarget && (
              <IconButton
                size="small"
                aria-label={`${favorite ? '즐겨찾기 편집' : '즐겨찾기 추가'}: ${node.name}`}
                aria-pressed={Boolean(favorite)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (favorite) {
                    openFavoriteEditor(menuTarget);
                    return;
                  }
                  void runFavoriteAction(() =>
                    createMenuFavorite(menuTarget.menuId, null, node.name),
                  ).then((response) => {
                    const createdFavorite = response?.favorites.find(
                      (item) => item.menuId === node.menuId,
                    );
                    if (createdFavorite && menuTarget) {
                      setEditingFavorite({
                        menuId: menuTarget.menuId,
                        menuName: node.name,
                        menuUrl: menuTarget.path,
                        favorite: createdFavorite,
                      });
                    } else if (response) {
                      const message = '등록된 즐겨찾기를 응답에서 찾을 수 없습니다.';
                      onFavoritesError?.(message);
                      setLocalError(onFavoritesError ? '' : message);
                    }
                  });
                }}
              >
                {favorite ? (
                  <StarOutlined fontSize="small" color="warning" />
                ) : (
                  <StarOutlineOutlined fontSize="small" />
                )}
              </IconButton>
            )}
          </Box>
        }
        onClick={
          hasChildren
            ? undefined
            : () => {
                onMenuSelect(node.id);
              }
        }
        onContextMenu={menuTarget ? (event) => openContextMenu(event, menuTarget) : undefined}
        onKeyDown={
          menuTarget
            ? (event) => {
                if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
                  return;
                }
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                setContextTarget(menuTarget);
                setContextPosition({ top: rect.bottom, left: rect.left });
              }
            : undefined
        }
        sx={{
          '& > .MuiTreeItem-content': {
            minHeight: 36,
            mb: 0.25,
            borderRadius: 1,
            color: hasChildren
              ? isDark
                ? '#cbd5e1'
                : '#475569'
              : isDark
                ? '#dbeafe'
                : '#475569',
            fontWeight: hasChildren ? 800 : isSelected ? 800 : 600,
            fontSize: hasChildren ? '0.72rem' : '0.875rem',
            letterSpacing: hasChildren ? '0.06em' : 0,
            textTransform: hasChildren ? 'uppercase' : 'none',
            borderLeft: isSelected
              ? '3px solid #60a5fa'
              : '3px solid transparent',
            bgcolor: isSelected
              ? isDark
                ? 'rgba(96,165,250,0.18)'
                : '#dfeeff'
              : 'transparent',
            '&:hover': {
              bgcolor: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
            },
          },
          '& > .MuiTreeItem-groupTransition': {
            ml: 1.25,
            pl: 0.75,
            borderLeft: `1px solid ${isDark ? 'rgba(148,163,184,0.2)' : '#dbe3ef'}`,
          },
        }}
      >
        {node.children?.map(renderMenuNode)}
      </TreeItem>
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: panelBg,
        color: isDark ? '#e2e8f0' : '#0f172a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2,
          height: 'var(--dashboard-header-height)',
          boxSizing: 'border-box',
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: softBg,
        }}
      >
        <Typography
          component="h2"
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: isDark ? '#cbd5e1' : '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          모듈 선택
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            component="h3"
            variant="caption"
            sx={{
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 700,
            }}
          >
            {selectedModule.name}
          </Typography>
          {onToggleMenu && (
            <IconButton
              size="small"
              aria-label="메뉴 닫기"
              onClick={onToggleMenu}
              sx={{ color: isDark ? '#cbd5e1' : '#475569' }}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          overflowY: 'auto',
        }}
      >
        <SimpleTreeView
          key={treeStateKey}
          defaultExpandedItems={expandedItemIds}
          defaultSelectedItems={selectedMenuId}
          expansionTrigger="content"
          sx={{ flex: 1, overflow: 'auto' }}
        >
          {selectedModule.tree.map(renderMenuNode)}
        </SimpleTreeView>
        <MenuFavoriteContextMenu
          target={contextTarget}
          anchorPosition={contextPosition}
          onClose={() => {
            setContextTarget(null);
            setContextPosition(null);
          }}
          folders={favorites.folders}
          folderCounts={new Map(
            favorites.folders.map((folder) => [
              folder.folderId,
              favorites.favorites.filter((favorite) => favorite.folderId === folder.folderId).length,
            ]),
          )}
          onCreateFolder={async (name) => {
            await runFavoriteAction(() => createMenuFavoriteFolder(name));
          }}
          onRenameFolder={async (id, name) => {
            await runFavoriteAction(() => renameMenuFavoriteFolder(id, name));
          }}
          onDeleteFolder={async (id) => {
            await runFavoriteAction(() => deleteMenuFavoriteFolder(id));
          }}
          onMoveFavorite={async (id, folderId) => {
            await runFavoriteAction(() => moveMenuFavorite(id, folderId));
          }}
          onDeleteFavorite={async (id) => {
            await runFavoriteAction(() => deleteMenuFavorite(id));
          }}
          onCreateFavorite={async (menuId, folderId) => {
            await runFavoriteAction(() => createMenuFavorite(menuId, folderId));
          }}
          onEditFavorite={openFavoriteEditor}
        />
        {editingFavorite && (
          <MenuFavoriteEditDialog
            open
            menuName={editingFavorite.menuName}
            menuUrl={editingFavorite.menuUrl}
            favorite={editingFavorite.favorite}
            folders={favorites.folders}
            onClose={() => setEditingFavorite(null)}
            onMore={() => {
              setEditingFavorite(null);
              onFavoritesMore?.();
            }}
            onSave={async (name, folderId) => {
              await moveMenuFavorite(editingFavorite.favorite.favoriteId, folderId, name);
              await onFavoritesRefresh?.();
            }}
            onRemove={async () => {
              await deleteMenuFavorite(editingFavorite.favorite.favoriteId);
              await onFavoritesRefresh?.();
            }}
          />
        )}
        <Snackbar open={Boolean(localError)} autoHideDuration={5000} onClose={() => setLocalError('')}>
          <Alert severity="error" onClose={() => setLocalError('')}>{localError}</Alert>
        </Snackbar>
      </Box>
      <Box
        sx={{
          px: 1.5,
          pt: 1.25,
          pb: 1.25,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255,255,255,0.62)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.75,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <HistoryOutlined sx={{ fontSize: 16, color: '#60a5fa' }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: isDark ? '#cbd5e1' : '#475569',
                letterSpacing: '0.06em',
              }}
            >
              최근 사용
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              minWidth: 22,
              px: 0.6,
              py: 0.15,
              borderRadius: 10,
              bgcolor: isDark ? 'rgba(96,165,250,0.18)' : '#dbeafe',
              color: isDark ? '#bfdbfe' : '#2563eb',
              fontWeight: 800,
              textAlign: 'center',
            }}
          >
            {recentMenuItems.length}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {recentMenuItems.length === 0 ? (
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: 1.5,
              }}
            >
              최근 방문한 메뉴가 없습니다.
            </Typography>
          ) : (
            recentMenuItems.map((item) => (
              <Button
                key={`${item.moduleId}:${item.menuId}`}
                variant="text"
                onClick={() => onRecentMenuSelect?.(item.path)}
                sx={{
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  px: 1,
                  py: 0.7,
                  minHeight: 46,
                  borderRadius: 1.5,
                  color: isDark ? '#dbeafe' : '#1e293b',
                  bgcolor: isDark
                    ? 'rgba(96,165,250,0.08)'
                    : 'rgba(37,99,235,0.04)',
                  textTransform: 'none',
                  fontWeight: 600,
                  textAlign: 'left',
                  '&:focus-visible': {
                    outline: `2px solid ${isDark ? '#93c5fd' : '#2563eb'}`,
                    outlineOffset: 1,
                  },
                  '&:hover': {
                    bgcolor: isDark
                      ? 'rgba(96,165,250,0.12)'
                      : 'rgba(37,99,235,0.08)',
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#60a5fa',
                    mr: 1,
                    mt: 0.6,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, display: 'block', flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        flexShrink: 0,
                        color: isDark ? '#93c5fd' : '#2563eb',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {formatRecentMenuTime(item.visitedAt)}
                    </Typography>
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      mt: 0.2,
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: '0.68rem',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.breadcrumbPath ||
                      [item.moduleName || item.moduleId, item.label].join(
                        ' > ',
                      )}
                  </Typography>
                </Box>
              </Button>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
