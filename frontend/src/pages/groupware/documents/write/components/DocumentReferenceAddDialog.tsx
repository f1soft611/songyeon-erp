import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { UserSelectEditor, type F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';

type DocumentReferenceAddDialogProps = {
  open: boolean;
  options: F1GridUserOption[];
  selectedUserIds: string[];
  error?: string;
  info?: string;
  isSubmitting: boolean;
  onSelectionChange: (userIds: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function DocumentReferenceAddDialog({
  open,
  options,
  selectedUserIds,
  error,
  info,
  isSubmitting,
  onSelectionChange,
  onClose,
  onSubmit,
}: DocumentReferenceAddDialogProps) {
  const handleSelectionChange = (value: F1GridUserValue) => {
    onSelectionChange(Array.isArray(value) ? value.map(String) : []);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      fullWidth
      maxWidth="sm"
      aria-labelledby="document-reference-add-title"
    >
      <DialogTitle id="document-reference-add-title">참조자 추가</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <UserSelectEditor
            value={selectedUserIds}
            options={options}
            multiple
            disableCloseOnSelect={false}
            hideSelectedOptions
            preserveSelectionOrder
            label="참조자 선택"
            readOnly={options.length === 0}
            disabled={isSubmitting}
            onChange={handleSelectionChange}
          />
        </Box>
        {options.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            추가할 수 있는 사용자가 없습니다.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {info}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting || selectedUserIds.length === 0}
        >
          {isSubmitting ? '추가 중...' : '참조자 추가'}
        </Button>
        <Button onClick={onClose} disabled={isSubmitting}>
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
