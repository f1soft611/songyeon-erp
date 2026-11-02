import { Box, Button, Typography } from '@mui/material';
import { UserSelectEditor, type F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';

type DocumentReferenceFieldProps = {
  userOptions: F1GridUserOption[];
  referenceUserIds: string[];
  onChange: (value: F1GridUserValue) => void;
  onOpenSettings?: () => void;
  settingsDisabled?: boolean;
};

export function DocumentReferenceField({
  userOptions,
  referenceUserIds,
  onChange,
  onOpenSettings,
  settingsDisabled = false,
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
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 0%' },
            minWidth: 0,
            '& .MuiInputBase-root': {
              height: 40,
              boxSizing: 'border-box',
            },
          }}
        >
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
        {onOpenSettings && (
          <Button
            size="small"
            variant="outlined"
            disabled={settingsDisabled}
            onClick={onOpenSettings}
            sx={{
              boxSizing: 'border-box',
              flexShrink: 0,
              height: 40,
              minHeight: 40,
            }}
          >
            자주 쓰는 참조자
          </Button>
        )}
      </Box>
    </Box>
  );
}
