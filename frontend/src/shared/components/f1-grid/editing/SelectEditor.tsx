import { Box, Input, MenuItem, Select } from '@mui/material';
import type { F1GridOption } from '../types/grid.types';

type SelectEditorProps = {
  value: string | number | boolean;
  options: F1GridOption[];
  selectOptionIcon?: (option: F1GridOption) => React.ReactNode;
  onChange: (value: string | number | boolean) => void;
};

const isRenderableIcon = (icon: React.ReactNode | undefined) =>
  icon !== undefined && icon !== null && icon !== false;

export function SelectEditor({
  value,
  options,
  selectOptionIcon,
  onChange,
}: SelectEditorProps) {
  const selectedOption =
    options.find((option) => String(option.value) === String(value)) ??
    options[0];

  const renderSelectedValue = (selected: string | number | boolean) => {
    const option = options.find(
      (candidate) => String(candidate.value) === String(selected),
    );
    const optionIcon =
      option && selectOptionIcon ? selectOptionIcon(option) : undefined;
    const label = option?.label ?? String(selected);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isRenderableIcon(optionIcon) && (
          <Box
            data-f1grid-option-icon="true"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {optionIcon}
          </Box>
        )}
        <Box>{label}</Box>
      </Box>
    );
  };

  return (
    <Select
      autoFocus
      fullWidth
      size="small"
      input={<Input disableUnderline />}
      value={String(value ?? selectedOption?.value ?? '')}
      renderValue={(selected) => renderSelectedValue(selected)}
      onChange={(event) =>
        onChange(
          options.find((option) => String(option.value) === event.target.value)
            ?.value ?? event.target.value,
        )
      }
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontSize: 'inherit',
        '& .MuiSelect-select': {
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          py: 0,
          pl: 0,
          pr: 3,
          minHeight: 'unset',
        },
      }}
    >
      {options.map((option) => {
        const optionIcon = selectOptionIcon
          ? selectOptionIcon(option)
          : undefined;

        return (
          <MenuItem key={String(option.value)} value={String(option.value)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isRenderableIcon(optionIcon) && (
                <Box
                  data-f1grid-option-icon="true"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {optionIcon}
                </Box>
              )}
              <Box>{option.label}</Box>
            </Box>
          </MenuItem>
        );
      })}
    </Select>
  );
}
