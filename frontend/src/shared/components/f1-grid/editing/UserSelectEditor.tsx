import { useMemo, type KeyboardEvent } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import type { F1GridUserOption } from '../types/grid.types';

export type F1GridUserValue = string | number | null | Array<string | number>;

export type UserSelectEditorProps = {
  value: F1GridUserValue;
  options: F1GridUserOption[];
  multiple?: boolean;
  hideSelectedOptions?: boolean;
  preserveSelectionOrder?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
  anchorEl?: HTMLElement | null;
  label: string;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  onChange: (value: F1GridUserValue) => void;
  onCommit?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

function getInitials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function UserSelectEditor({
  value,
  options,
  multiple = false,
  hideSelectedOptions = false,
  preserveSelectionOrder = false,
  autoFocus = false,
  compact = false,
  anchorEl,
  label,
  readOnly = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  onChange,
  onCommit,
  onKeyDown,
}: UserSelectEditorProps) {
  const selectedOptions = useMemo(() => {
    const selectedValues = Array.isArray(value) ? value : [value];
    if (multiple && preserveSelectionOrder) {
      return selectedValues.flatMap((selected) => {
        if (selected == null) return [];
        const option = options.find(
          (candidate) => String(candidate.value) === String(selected),
        );
        return option ? [option] : [];
      });
    }
    return options.filter((option) =>
      selectedValues.some((selected) =>
        selected == null ? false : String(selected) === String(option.value),
      ),
    );
  }, [multiple, options, preserveSelectionOrder, value]);
  const selectedValue = multiple
    ? selectedOptions
    : (selectedOptions[0] ?? null);
  const popperWidth =
    compact && anchorEl
      ? Math.max(
          0,
          Math.min(
            320,
            anchorEl.ownerDocument.documentElement.clientWidth -
              anchorEl.getBoundingClientRect().left -
              8,
          ),
        )
      : 320;
  const compactAnchorInset =
    compact && anchorEl
      ? anchorEl.clientLeft +
        Number.parseFloat(getComputedStyle(anchorEl).paddingLeft || '0')
      : 0;
  return (
    <Autocomplete<F1GridUserOption, boolean, false, false>
      data-f1grid-user-picker="true"
      fullWidth
      multiple={multiple}
      readOnly={readOnly}
      disabled={disabled}
      openOnFocus
      disableCloseOnSelect={multiple}
      filterSelectedOptions={hideSelectedOptions}
      options={options}
      value={selectedValue as F1GridUserOption | F1GridUserOption[] | null}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) =>
        String(option.value) === String(selected.value)
      }
      filterOptions={(availableOptions, state) => {
        const query = state.inputValue.trim().toLocaleLowerCase();
        if (!query) return availableOptions;
        return availableOptions.filter((option) =>
          [option.label, option.positionName, option.departmentName]
            .filter(Boolean)
            .some((text) => text!.toLocaleLowerCase().includes(query)),
        );
      }}
      onChange={(_event, nextValue) => {
        if (Array.isArray(nextValue)) {
          onChange(nextValue.map((option) => option.value));
          return;
        }
        onChange(nextValue?.value ?? null);
      }}
      onClose={(_event, reason) => {
        if (multiple && reason === 'blur') onCommit?.();
      }}
      onKeyDown={(event) => onKeyDown?.(event)}
      slotProps={{
        listbox: {
          sx: { maxHeight: 280, overflowY: 'auto' },
        },
        popper: {
          placement: 'bottom-start',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [-compactAnchorInset, compact ? 6 : 0],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                altAxis: true,
                boundary: 'viewport',
                padding: 8,
              },
            },
          ],
          sx: {
            width: popperWidth,
            minWidth: popperWidth,
            maxWidth: 'calc(100vw - 16px)',
          },
        },
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box
            component="li"
            key={key}
            {...optionProps}
            data-f1grid-user-option="true"
            sx={{ alignItems: 'center', gap: 1.25, minHeight: 56 }}
          >
            <Avatar
              src={option.avatarUrl ?? undefined}
              sx={{ height: 36, width: 36 }}
            >
              {getInitials(option.label)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                {option.label}
              </Typography>
              {[option.positionName, option.departmentName].filter(Boolean)
                .length > 0 && (
                <Typography noWrap variant="caption" color="text.secondary">
                  {[option.positionName, option.departmentName]
                    .filter(Boolean)
                    .join(' ')}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderValue={(selected) => {
        const selectedItems = Array.isArray(selected) ? selected : [selected];
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedItems.map((option) => (
              <Chip
                key={String(option.value)}
                avatar={
                  <Avatar src={option.avatarUrl ?? undefined}>
                    {getInitials(option.label)}
                  </Avatar>
                }
                label={option.label}
                size="small"
                onDelete={() => {
                  if (disabled) return;
                  const remaining = selectedItems.filter(
                    (item) => String(item.value) !== String(option.value),
                  );
                  onChange(
                    multiple ? remaining.map((item) => item.value) : null,
                  );
                }}
              />
            ))}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          label={compact ? undefined : label}
          variant={compact ? 'standard' : 'outlined'}
          margin="none"
          disabled={disabled}
          required={required}
          error={error}
          helperText={helperText}
          size="small"
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              readOnly,
              'aria-label': compact ? label : undefined,
              'aria-required': required,
              'aria-invalid': error,
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              minHeight: compact ? 0 : 38,
              ...(compact ? { height: '100%' } : {}),
              py: 0,
            },
            '& .MuiInputBase-input': {
              fontSize: compact ? '0.8rem' : '0.9rem',
              ...(compact ? { padding: '0 !important' } : {}),
            },
            ...(compact
              ? {
                  '& .MuiAutocomplete-inputRoot': {
                    flexWrap: 'nowrap',
                    padding: '0 !important',
                  },
                  '& .MuiInput-root::before, & .MuiInput-root::after': {
                    display: 'none',
                  },
                }
              : {}),
            '& .MuiInputLabel-root': {
              fontSize: '0.82rem',
              fontWeight: 600,
            },
            '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': {
              transform: 'translate(14px, 11px) scale(1)',
            },
            '& .MuiFormHelperText-root': { marginLeft: 0, marginTop: 0.5 },
          }}
        />
      )}
    />
  );
}
