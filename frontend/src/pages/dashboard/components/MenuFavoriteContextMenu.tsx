import { useState } from 'react';
import {
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  TextField,
} from '@mui/material';
import type {
  FavoriteFolder,
  FavoriteMenu,
} from '../types/menuFavorite.types';

export type FavoriteContextTarget =
  | { kind: 'root' }
  | { kind: 'folder'; folder: FavoriteFolder }
  | { kind: 'favorite'; favorite: FavoriteMenu; label: string }
  | { kind: 'available-menu'; menuId: number; label: string; path: string; favorite?: FavoriteMenu };

type Props = {
  target: FavoriteContextTarget | null;
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  onCreateFolder: (folderName: string) => Promise<void>;
  onRenameFolder: (folderId: number, folderName: string) => Promise<void>;
  onDeleteFolder: (folderId: number) => Promise<void>;
  onMoveFavorite: (favoriteId: number, folderId: number | null) => Promise<void>;
  onDeleteFavorite: (favoriteId: number) => Promise<void>;
  onCreateFavorite: (menuId: number, folderId: number | null) => Promise<void>;
  onEditFavorite?: (target: Extract<FavoriteContextTarget, { kind: 'available-menu' }>) => void;
  folders: FavoriteFolder[];
  folderCounts: Map<number, number>;
};

export function MenuFavoriteContextMenu({
  target,
  anchorPosition,
  onClose,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFavorite,
  onDeleteFavorite,
  onCreateFavorite,
  onEditFavorite,
  folders,
  folderCounts,
}: Props) {
  const [dialog, setDialog] = useState<'create' | 'rename' | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderToRename, setFolderToRename] = useState<FavoriteFolder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitFolder = async () => {
    const name = folderName.trim();
    if (!name || name.length > 40 || submitting) return;
    setSubmitting(true);
    try {
      if (dialog === 'rename' && folderToRename) {
        await onRenameFolder(folderToRename.folderId, name);
      } else {
        await onCreateFolder(name);
      }
      setDialog(null);
      setFolderName('');
      setFolderToRename(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setFolderName('');
    setFolderToRename(null);
  };

  return (
    <>
      <Menu
        open={Boolean(target && anchorPosition && !dialog)}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ?? undefined}
        slotProps={{ list: { 'aria-label': '즐겨찾기 작업' } }}
      >
        {(target?.kind === 'root' || target?.kind === 'folder') && (
          <MenuItem
            onClick={() => {
              setFolderName(target.kind === 'folder' ? target.folder.folderName : '');
              setFolderToRename(target.kind === 'folder' ? target.folder : null);
              setDialog(target.kind === 'folder' ? 'rename' : 'create');
            }}
          >
            {target.kind === 'folder' ? '폴더 이름 변경' : '폴더 만들기'}
          </MenuItem>
        )}
        {target?.kind === 'folder' && (
          <MenuItem
            disabled={(folderCounts.get(target.folder.folderId) ?? 0) > 0}
            onClick={() => {
              void onDeleteFolder(target.folder.folderId).then(onClose);
            }}
          >
            폴더 삭제
          </MenuItem>
        )}
        {target?.kind === 'favorite' && (
          <>
            <MenuItem onClick={() => {
              void onMoveFavorite(target.favorite.favoriteId, null).then(onClose);
            }}>
              루트로 이동
            </MenuItem>
            {folders.map((folder) => (
              <MenuItem
                key={folder.folderId}
                onClick={() => {
                  void onMoveFavorite(target.favorite.favoriteId, folder.folderId).then(onClose);
                }}
              >
                {folder.folderName}(으)로 이동
              </MenuItem>
            ))}
            <MenuItem onClick={() => {
              void onDeleteFavorite(target.favorite.favoriteId).then(onClose);
            }}>
              즐겨찾기 해제
            </MenuItem>
          </>
        )}
        {target?.kind === 'available-menu' && !target.favorite && (
          <>
            <MenuItem onClick={() => onCreateFavorite(target.menuId, null).then(onClose)}>
              루트에 즐겨찾기 추가
            </MenuItem>
            {folders.map((folder) => (
              <MenuItem
                key={folder.folderId}
                onClick={() => onCreateFavorite(target.menuId, folder.folderId).then(onClose)}
              >
                {folder.folderName}에 추가
              </MenuItem>
            ))}
          </>
        )}
        {target?.kind === 'available-menu' && target.favorite && (
          <>
            <MenuItem
              onClick={() => {
                onEditFavorite?.(target);
                onClose();
              }}
            >
              즐겨찾기 편집
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              const favorite = target.kind === 'available-menu' ? target.favorite : undefined;
              if (favorite) void onMoveFavorite(favorite.favoriteId, null).then(onClose);
            }}>
              루트로 이동
            </MenuItem>
            {folders.map((folder) => (
              <MenuItem
                key={folder.folderId}
                onClick={() => {
                  const favorite = target.kind === 'available-menu' ? target.favorite : undefined;
                  if (favorite) void onMoveFavorite(favorite.favoriteId, folder.folderId).then(onClose);
                }}
              >
                {folder.folderName}(으)로 이동
              </MenuItem>
            ))}
            <MenuItem onClick={() => {
              const favorite = target.kind === 'available-menu' ? target.favorite : undefined;
              if (favorite) void onDeleteFavorite(favorite.favoriteId).then(onClose);
            }}>
              즐겨찾기 해제
            </MenuItem>
          </>
        )}
        {target?.kind === 'available-menu' && (
          <>
            <Divider />
            <MenuItem
              onClick={() => {
                setFolderToRename(null);
                setFolderName('');
                setDialog('create');
              }}
            >
              폴더 만들기
            </MenuItem>
            {folders.map((folder) => (
              <MenuItem
                key={`rename-${folder.folderId}`}
                onClick={() => {
                  setFolderToRename(folder);
                  setFolderName(folder.folderName);
                  setDialog('rename');
                }}
              >
                {folder.folderName} 이름 변경
              </MenuItem>
            ))}
            {folders.map((folder) => (
              <MenuItem
                key={`delete-${folder.folderId}`}
                disabled={(folderCounts.get(folder.folderId) ?? 0) > 0}
                onClick={() => {
                  void onDeleteFolder(folder.folderId).then(onClose);
                }}
              >
                {folder.folderName} 삭제
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
      <Dialog open={dialog !== null} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>{dialog === 'rename' ? '폴더 이름 변경' : '즐겨찾기 폴더 만들기'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="폴더명"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 40 } }}
            error={folderName.trim().length === 0 || folderName.trim().length > 40}
            helperText="공백 제외 1~40자"
          />
        </DialogContent>
        <DialogActions>
          <Button
              variant="contained"
            onClick={() => void submitFolder()}
            disabled={!folderName.trim() || folderName.trim().length > 40 || submitting}
          >
            저장
          </Button>
          <Button onClick={closeDialog}>취소</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
