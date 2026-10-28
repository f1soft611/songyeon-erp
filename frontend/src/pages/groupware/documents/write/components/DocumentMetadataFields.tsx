import { Box, MenuItem, TextField } from '@mui/material';
import type { DraftFormRow } from '../../../../co/workflow/form/types/draftFormManagement.types';
import type { fetchDraftFormOptions } from '../../../../co/workflow/form/services/draftFormManagement.service';
import { ALL_CATEGORY_VALUE } from '../hooks/useDocumentComposer';

type DocumentMetadataFieldsProps = {
  draftDate: string;
  drafterName: string;
  categoryItems: Awaited<ReturnType<typeof fetchDraftFormOptions>>['categoryItems'];
  availableForms: DraftFormRow[];
  selectedCategoryId: string;
  selectedFormId: string;
  disabled: boolean;
  onCategoryChange: (value: string) => void;
  onFormChange: (value: string) => void;
};

export function DocumentMetadataFields({
  draftDate,
  drafterName,
  categoryItems,
  availableForms,
  selectedCategoryId,
  selectedFormId,
  disabled,
  onCategoryChange,
  onFormChange,
}: DocumentMetadataFieldsProps) {
  const fieldSx = {
    '& .MuiInputBase-root': { minHeight: 38 },
    '& .MuiInputBase-input, & .MuiSelect-select': {
      fontSize: '0.93rem',
      paddingBottom: '8.5px',
      paddingTop: '8.5px',
    },
    '& .MuiInputLabel-root': {
      color: 'text.secondary',
      fontSize: '0.82rem',
      fontWeight: 600,
      opacity: 1,
    },
    '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
  };
  return (
    <Box
      data-testid="document-draft-metadata"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 1.25,
        flexShrink: 0,
      }}
    >
      <TextField label="기안일" value={draftDate} fullWidth size="small" margin="none"
        slotProps={{ htmlInput: { readOnly: true } }} sx={fieldSx} />
      <TextField label="기안자" value={drafterName} fullWidth size="small" margin="none"
        slotProps={{ htmlInput: { readOnly: true } }} sx={fieldSx} />
      <TextField
        select label="구분" value={selectedCategoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        fullWidth size="small" margin="none" disabled={disabled}
        helperText={!disabled && categoryItems.length === 0 ? '등록된 분류가 없습니다.' : undefined}
        sx={fieldSx}
      >
        <MenuItem value={ALL_CATEGORY_VALUE}>전체</MenuItem>
        {categoryItems.map((category) => (
          <MenuItem key={category.id} value={category.id}>{category.itemNm}</MenuItem>
        ))}
      </TextField>
      <TextField
        select label="기안양식" value={selectedFormId}
        onChange={(event) => onFormChange(event.target.value)}
        fullWidth size="small" margin="none"
        disabled={disabled || availableForms.length === 0}
        helperText={!disabled && availableForms.length === 0 ? '선택 가능한 기안양식이 없습니다.' : undefined}
        sx={fieldSx}
      >
        {availableForms.map((form) => (
          <MenuItem key={form.draftingWorkCategoryId} value={String(form.draftingWorkCategoryId)}>
            {form.codeName}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
