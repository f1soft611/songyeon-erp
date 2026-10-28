import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

// 확인 · 알림 창(송연 confirm·alert 문구를 줄바꿈 그대로 보여준다). 2026-10-27 co/basic-info 의 BasicInfoConfirmDialog 를 공통으로 옮김.
// S_ERP UnsavedChangesConfirmDialog 는 설명을 줄바꿈 없이 보여 줘서 송연 문구(여러 줄)에 그대로 쓰지 않는다
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  danger = false,
  alertOnly = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  alertOnly?: boolean; // 알림만(확인 단추 하나)
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth aria-labelledby="basic-info-confirm-title">
      <DialogTitle id="basic-info-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        {!alertOnly && <Button onClick={onCancel}>취소</Button>}
        <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
