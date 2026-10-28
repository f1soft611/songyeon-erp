import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export type UnsavedChangesConfirmDialogAction = {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'text' | 'outlined' | 'contained';
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning';
  disabled?: boolean;
  autoFocus?: boolean;
};

export type UnsavedChangesConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  continueLabel?: string;
  onCancel: () => void;
  onContinue: () => void;
  disableContinue?: boolean;
  confirmButtonColor?: 'primary' | 'warning' | 'error';
  dialogTitleId?: string;
  actions?: UnsavedChangesConfirmDialogAction[];
};

export function UnsavedChangesConfirmDialog({
  open,
  title = '저장하지 않은 변경사항',
  description = '현재 변경사항을 유지하지 않고 계속하시겠습니까?',
  cancelLabel = '취소',
  continueLabel = '계속',
  onCancel,
  onContinue,
  disableContinue = false,
  confirmButtonColor = 'primary',
  dialogTitleId,
  actions,
}: UnsavedChangesConfirmDialogProps) {
  const actionItems: UnsavedChangesConfirmDialogAction[] =
    actions && actions.length > 0
      ? actions
      : [
          {
            label: continueLabel,
            onClick: onContinue,
            variant: 'contained',
            color: confirmButtonColor,
            disabled: disableContinue,
            autoFocus: true,
          },
          {
            label: cancelLabel,
            onClick: onCancel,
            variant: 'text',
            autoFocus: false,
          },
        ];

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby={dialogTitleId ?? 'unsaved-changes-dialog-title'}
    >
      <DialogTitle id={dialogTitleId ?? 'unsaved-changes-dialog-title'}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {actionItems.map((action) => {
          const variant = (action.variant ?? 'text') as
            | 'text'
            | 'outlined'
            | 'contained';

          return (
            <Button
              key={action.label}
              variant={variant}
              color={action.color ?? 'primary'}
              onClick={action.onClick}
              disabled={action.disabled}
              autoFocus={action.autoFocus}
            >
              {action.label}
            </Button>
          );
        })}
      </DialogActions>
    </Dialog>
  );
}
