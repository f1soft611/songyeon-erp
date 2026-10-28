import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import type { ApprovalDocumentStatus } from '../types/documentWrite.types';

type DocumentActionsMenuProps = {
  isDrafter?: boolean;
  documentStatus?: ApprovalDocumentStatus;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function DocumentActionsMenu({
  isDrafter,
  documentStatus,
  disabled = false,
  onEdit,
  onDelete,
}: DocumentActionsMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const canEdit = isDrafter === true
    && (documentStatus === 'DRAFT' || documentStatus === 'REVISION_REQUESTED');
  const canDelete = isDrafter === true && documentStatus === 'DRAFT';
  if (!canEdit && !canDelete) return null;

  return (
    <>
      <IconButton
        aria-label="문서 더보기"
        size="small"
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {canEdit && (
          <MenuItem onClick={() => {
            setAnchor(null);
            onEdit();
          }}>
            {documentStatus === 'REVISION_REQUESTED' ? '수정 후 재상신' : '문서 수정'}
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => {
            setAnchor(null);
            onDelete();
          }}>
            삭제
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
