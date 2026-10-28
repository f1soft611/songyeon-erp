import { Box, Typography } from '@mui/material';
import { UserSelectEditor, type F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';

type DocumentReferenceFieldProps = {
  userOptions: F1GridUserOption[];
  referenceUserIds: string[];
  onChange: (value: F1GridUserValue) => void;
};

export function DocumentReferenceField({
  userOptions,
  referenceUserIds,
  onChange,
}: DocumentReferenceFieldProps) {
  return (
    <Box
      data-testid="document-reference-row"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '64px minmax(0, 1fr)', sm: '80px minmax(0, 1fr)' },
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>참조</Typography>
      <Box sx={{ minWidth: 0 }}>
        <UserSelectEditor
          value={referenceUserIds}
          options={userOptions}
          multiple
          label="참조자 선택"
          onChange={onChange}
          hideSelectedOptions
          preserveSelectionOrder
        />
      </Box>
    </Box>
  );
}
