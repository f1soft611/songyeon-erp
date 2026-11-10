import { useMemo, useState, type MouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import StarOutlineOutlined from '@mui/icons-material/StarOutlineOutlined';
import type {
  FavoriteFolder,
  FavoriteMenu,
  MenuFavoritesResponse,
} from '../types/menuFavorite.types';
import type { ModuleItem, MenuTreeNode } from '../types/dashboard';
import {
  createMenuFavoriteFolder,
  createMenuFavorite,
  deleteMenuFavorite,
  deleteMenuFavoriteFolder,
  moveMenuFavorite,
  renameMenuFavoriteFolder,
} from '../services/menuFavorite.service';
import {
  MenuFavoriteContextMenu,
  type FavoriteContextTarget,
} from './MenuFavoriteContextMenu';
import { SimpleTreeView, TreeItem, treeItemClasses } from '@mui/x-tree-view';
import { CommonDialog } from '../../../shared/components/CommonDialog';

type Props = {
  favorites: MenuFavoritesResponse;
  moduleItems: ModuleItem[];
  onMenuSelect: (moduleId: string, menuId: string) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};

type ResolvedMenu = { moduleId: string; node: MenuTreeNode };

const resolveMenu = (
  modules: ModuleItem[],
  menuId: number,
): ResolvedMenu | undefined => {
  const visit = (nodes: MenuTreeNode[], moduleId: string): ResolvedMenu | undefined => {
    for (const node of nodes) {
      if (node.menuId === menuId && !node.children?.length && node.path) {
        return { moduleId, node };
      }
      const child = visit(node.children ?? [], moduleId);
      if (child) return child;
    }
    return undefined;
  };
  for (const module of modules) {
    const result = visit(module.tree, module.id);
    if (result) return result;
  }
  return undefined;
};

export function MenuFavoritesTree({
  favorites,
  moduleItems,
  onMenuSelect,
  onRefresh,
  onError,
}: Props) {
  const [target, setTarget] = useState<FavoriteContextTarget | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [createFolderError, setCreateFolderError] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const folderCounts = useMemo(() => {
    const counts = new Map<number, number>();
    favorites.favorites.forEach((favorite) => {
      if (favorite.folderId !== null) {
        counts.set(favorite.folderId, (counts.get(favorite.folderId) ?? 0) + 1);
      }
    });
    return counts;
  }, [favorites.favorites]);

  const menuLabels = useMemo(() => {
    const labels = new Map<number, ResolvedMenu>();
    favorites.favorites.forEach((favorite) => {
      const resolved = resolveMenu(moduleItems, favorite.menuId);
      if (resolved) labels.set(favorite.favoriteId, resolved);
    });
    return labels;
  }, [favorites.favorites, moduleItems]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : '즐겨찾기 작업에 실패했습니다.');
    }
  };

  const showMenu = (
    event: MouseEvent<HTMLElement>,
    nextTarget: FavoriteContextTarget,
  ) => {
    event.preventDefault();
    setTarget(nextTarget);
    setAnchorPosition(
      event.type === 'contextmenu'
        ? { top: event.clientY, left: event.clientX }
        : (() => {
            const rect = event.currentTarget.getBoundingClientRect();
            return { top: rect.bottom, left: rect.right };
          })(),
    );
  };

  const renderFavorite = (favorite: FavoriteMenu) => {
    const resolved = menuLabels.get(favorite.favoriteId);
    if (!resolved) return null;
    const label = favorite.favoriteName?.trim() || resolved.node.name;
    return (
      <TreeItem
        key={`favorite-${favorite.favoriteId}`}
        itemId={`favorite-${favorite.favoriteId}`}
        aria-label={`메뉴: ${label}`}
        sx={(theme) => ({
          [`& > .${treeItemClasses.content}`]: {
            minHeight: 36,
            mb: 0.25,
            borderRadius: 1,
            borderLeft: '3px solid transparent',
            fontSize: '0.875rem',
            color: theme.palette.mode === 'dark' ? '#dbeafe' : '#475569',
          },
        })}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <Box
              component="span"
              onClick={() => onMenuSelect(resolved.moduleId, resolved.node.id)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}
            >
              <ArticleOutlined fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
              <Box
                component="span"
                title={label}
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 400,
                }}
              >
                {label}
              </Box>
            </Box>
            <IconButton
              size="small"
              aria-label={`즐겨찾기 작업: ${label}`}
              onClick={(event) => showMenu(event, { kind: 'favorite', favorite, label })}
              sx={{ flexShrink: 0 }}
            >
              <MoreVertOutlined fontSize="small" />
            </IconButton>
          </Box>
        }
        onContextMenu={(event) => showMenu(event, { kind: 'favorite', favorite, label })}
      />
    );
  };

  const renderFolder = (folder: FavoriteFolder) => (
    <TreeItem
      key={`folder-${folder.folderId}`}
      itemId={`folder-${folder.folderId}`}
      aria-label={`폴더: ${folder.folderName}`}
      sx={(theme) => ({
        [`& > .${treeItemClasses.content}`]: {
          minHeight: 36,
          mb: 0.25,
          borderRadius: 1,
          borderLeft: '3px solid transparent',
          fontSize: '0.875rem',
          color: theme.palette.mode === 'dark' ? '#dbeafe' : '#475569',
        },
      })}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <FolderOutlined fontSize="small" sx={{ mr: 1, flexShrink: 0 }} />
          <Box
            title={folder.folderName}
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 400,
            }}
          >
            {folder.folderName}
          </Box>
          <Typography
            component="span"
            variant="caption"
            sx={{ ml: 1, mr: 0.5, color: 'text.secondary', flexShrink: 0 }}
          >
            폴더
          </Typography>
          <IconButton
            size="small"
            aria-label={`즐겨찾기 작업: ${folder.folderName}`}
            onClick={(event) => showMenu(event, { kind: 'folder', folder })}
            sx={{ flexShrink: 0 }}
          >
            <MoreVertOutlined fontSize="small" />
          </IconButton>
        </Box>
      }
      onContextMenu={(event) => showMenu(event, { kind: 'folder', folder })}
    >
      {favorites.favorites
        .filter((favorite) => favorite.folderId === folder.folderId)
        .map(renderFavorite)}
      {(folderCounts.get(folder.folderId) ?? 0) === 0 && (
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block' }}>
          폴더가 비어 있습니다.
        </Typography>
      )}
    </TreeItem>
  );

  const createFolder = async () => {
    const folderName = createFolderName.trim();
    if (!folderName || folderName.length > 40 || creatingFolder) return;
    setCreatingFolder(true);
    setCreateFolderError('');
    try {
      await createMenuFavoriteFolder(folderName);
      setCreateFolderOpen(false);
      setCreateFolderName('');
      await onRefresh();
    } catch (error) {
      setCreateFolderError(error instanceof Error ? error.message : '폴더 생성에 실패했습니다.');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        flexDirection: 'column',
        bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#f7f9fc',
      })}
    >
      <Box
        onContextMenu={(event) => showMenu(event, { kind: 'root' })}
        sx={(theme) => ({
          px: 2,
          height: 'var(--dashboard-header-height)',
          flexShrink: 0,
          boxSizing: 'border-box',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f1f5f9',
        })}
      >
        <Typography
          component="h2"
          variant="subtitle2"
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            fontWeight: 800,
            color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          })}
        >
          <StarOutlineOutlined fontSize="small" sx={{ mr: 1 }} />
          즐겨찾기
        </Typography>
        <Button
          size="small"
          aria-label="새 폴더"
          onClick={() => {
            setCreateFolderName('');
            setCreateFolderError('');
            setCreateFolderOpen(true);
          }}
          sx={{ ml: 'auto', textTransform: 'none' }}
        >
          새 폴더
        </Button>
      </Box>
      <SimpleTreeView sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {favorites.favorites
          .filter((favorite) => favorite.folderId === null)
          .map(renderFavorite)}
        {favorites.folders.map(renderFolder)}
      </SimpleTreeView>
      <MenuFavoriteContextMenu
        target={target}
        anchorPosition={anchorPosition}
        onClose={() => {
          setTarget(null);
          setAnchorPosition(null);
        }}
        folders={favorites.folders}
        folderCounts={folderCounts}
        onCreateFolder={(name) => run(() => createMenuFavoriteFolder(name))}
        onRenameFolder={(id, name) => run(() => renameMenuFavoriteFolder(id, name))}
        onDeleteFolder={(id) => run(() => deleteMenuFavoriteFolder(id))}
        onMoveFavorite={(id, folderId) => run(() => moveMenuFavorite(id, folderId))}
        onDeleteFavorite={(id) => run(() => deleteMenuFavorite(id))}
        onCreateFavorite={(menuId, folderId) =>
          run(() => createMenuFavorite(menuId, folderId))
        }
      />
      <CommonDialog
        open={createFolderOpen}
        onClose={() => {
          if (!creatingFolder) setCreateFolderOpen(false);
        }}
        title="즐겨찾기 폴더 만들기"
        size="xs"
        actions={
          <>
            <Button
              variant="contained"
              onClick={() => void createFolder()}
              disabled={!createFolderName.trim() || createFolderName.trim().length > 40 || creatingFolder}
            >
              만들기
            </Button>
            <Button onClick={() => setCreateFolderOpen(false)} disabled={creatingFolder}>
              취소
            </Button>
          </>
        }
      >
        {createFolderError && <Alert severity="error" sx={{ mb: 1.5 }}>{createFolderError}</Alert>}
        <TextField
          autoFocus
          fullWidth
          label="폴더명"
          value={createFolderName}
          onChange={(event) => setCreateFolderName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 40 } }}
          error={createFolderName.trim().length === 0 || createFolderName.trim().length > 40}
          helperText="공백 제외 1~40자"
        />
      </CommonDialog>
    </Box>
  );
}
