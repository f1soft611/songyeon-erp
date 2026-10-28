import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Button, Stack, TextField } from '@mui/material';
import { MasterPickerDialog } from './MasterPickerDialog';
import type {
  MasterPickerOption,
  MasterPickerProps,
} from './masterPicker.types';

export function MasterPicker({
  label,
  value,
  search,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
}: MasterPickerProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (option: MasterPickerOption) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', minWidth: 0, mt: 2 }}
      >
        <TextField
          label={label}
          size="small"
          fullWidth
          required={required}
          error={error}
          helperText={helperText}
          value={value ? `${value.code} · ${value.name}` : ''}
          slotProps={{ input: { readOnly: true } }}
          sx={{
            '& .MuiInputBase-root': { height: 40, borderRadius: 1.5 },
            '& .MuiFormHelperText-root': { whiteSpace: 'nowrap' },
          }}
        />
        <Button
          type="button"
          variant="contained"
          disableElevation
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label={`${label} 선택`}
          startIcon={<SearchIcon fontSize="small" />}
          sx={{
            flexShrink: 0,
            minWidth: 76,
            height: 40,
            minHeight: 40,
            borderRadius: 1.5,
            fontWeight: 700,
          }}
        >
          선택
        </Button>
      </Stack>
      <MasterPickerDialog
        label={label}
        open={open}
        search={search}
        onClose={() => setOpen(false)}
        onChange={handleChange}
      />
    </>
  );
}
