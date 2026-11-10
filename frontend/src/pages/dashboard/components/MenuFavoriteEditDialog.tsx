import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { CommonDialog } from '../../../shared/components/CommonDialog';
import type { FavoriteFolder, FavoriteMenu } from '../types/menuFavorite.types';

type Props = {
  open: boolean;
  menuName: string;
  menuUrl: string;
  favorite?: FavoriteMenu;
  folders: FavoriteFolder[];
  onClose: () => void;
  onMore: () => void;
  onSave: (name: string, folderId: number | null) => Promise<void>;
  onRemove: () => Promise<void>;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '즐겨찾기 작업에 실패했습니다.';

export function MenuFavoriteEditDialog({
  open,
  menuName,
  menuUrl,
  favorite,
  folders,
  onClose,
  onMore,
  onSave,
  onRemove,
}: Props) {
  const [name, setName] = useState(menuName);
  const [folderValue, setFolderValue] = useState('root');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(favorite?.favoriteName?.trim() || menuName);
    setFolderValue(favorite?.folderId == null ? 'root' : String(favorite.folderId));
    setError('');
  }, [favorite?.favoriteId, favorite?.favoriteName, favorite?.folderId, menuName, open]);

  const close = () => {
    if (!submitting) onClose();
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setError('이름은 공백 제외 1~100자로 입력해 주세요.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSave(trimmedName, folderValue === 'root' ? null : Number(folderValue));
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!favorite || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onRemove();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CommonDialog
      open={open}
      onClose={close}
      title="즐겨찾기 편집"
      size="xs"
      footerStart={<Button onClick={onMore} disabled={submitting}>더보기</Button>}
      actions={
        <>
          <Button variant="contained" onClick={() => void save()} disabled={submitting}>
            완료
          </Button>
          {favorite && (
            <Button color="error" onClick={() => void remove()} disabled={submitting}>
              제거
            </Button>
          )}
        </>
      }
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          label="이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          fullWidth
          label="URL"
          value={menuUrl}
          slotProps={{ htmlInput: { readOnly: true } }}
        />
        <TextField
          select
          fullWidth
          label="폴더"
          value={folderValue}
          onChange={(event) => setFolderValue(event.target.value)}
        >
          <MenuItem value="root">즐겨찾기 루트</MenuItem>
          {folders.map((folder) => (
            <MenuItem key={folder.folderId} value={String(folder.folderId)}>
              {folder.folderName}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </CommonDialog>
  );
}
