import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import type {
  F1GridColumn,
  F1GridFormMode,
  F1GridOption,
} from '../types/grid.types';
import {
  isGridCheckboxChecked,
  normalizeGridNumberInput,
} from '../utils/grid.utils';
import { UserSelectEditor } from '../editing/UserSelectEditor';
import { normalizeF1GridInput } from '../editing/inputFormat';
import { useF1GridFormattedInput } from '../editing/useF1GridFormattedInput';

export type GridFormFieldProps<T extends object> = {
  column: F1GridColumn<T>;
  row: T;
  mode: F1GridFormMode;
  value: unknown;
  readOnly: boolean;
  disabled?: boolean;
  error?: string;
  onPatch: (patch: Partial<T>) => void;
};

const requiredAsteriskStyle = {
  color: 'error.main',
  fontWeight: 700,
  lineHeight: 1,
  ml: 0.25,
} as const;

const renderRequiredFieldLabel = (label: string, required: boolean) => (
  <>
    {label}
    {required ? (
      <Box component="span" aria-hidden="true" sx={requiredAsteriskStyle}>
        *
      </Box>
    ) : null}
  </>
);

export function GridFormField<T extends object>({
  column,
  row,
  value,
  readOnly,
  disabled = false,
  error,
  onPatch,
}: GridFormFieldProps<T>) {
  const fieldName = String(column.field);
  const helperTextId = `${fieldName}-form-helper-text`;
  const displayedValue =
    column.type === 'user' ||
    (column.form?.multiple && column.type === 'select')
      ? value
      : column.getValue
        ? column.getValue(row)
        : value;
  const options = column.options ?? [];
  const isRequired = Boolean(column.required);

  const applyValue = (nextValue: unknown, normalizeString = true) => {
    const normalizedValue =
      normalizeString && typeof nextValue === 'string'
        ? normalizeF1GridInput(
            nextValue,
            column.inputFormat,
            column.sanitizeInput,
          )
        : nextValue;
    onPatch(
      column.onValueChange?.(row, normalizedValue) ??
        ({ [column.field]: normalizedValue } as Partial<T>),
    );
  };

  const { inputRef, handleChange: handleFormattedChange } =
    useF1GridFormattedInput({
      value: String(displayedValue ?? ''),
      inputFormat: column.inputFormat,
      sanitizeInput: column.sanitizeInput,
      onChange: (nextValue) => applyValue(nextValue, false),
    });

  const sharedTextFieldProps = {
    fullWidth: true,
    disabled,
    label: renderRequiredFieldLabel(column.headerName, isRequired),
    margin: 'none' as const,
    required: false,
    error: Boolean(error),
    helperText: error,
    size: 'small' as const,
    sx: {
      '& .MuiInputBase-root': {
        minHeight: 38,
      },
      '& .MuiInputBase-input': {
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
      '& .MuiInputLabel-root.Mui-focused': {
        color: 'primary.main',
      },
      '& .MuiInputLabel-root.Mui-error': {
        color: 'error.main',
      },
      '& .MuiFormHelperText-root': {
        color: 'text.secondary',
        fontSize: '0.75rem',
        marginLeft: 0,
        marginTop: 0.5,
      },
    },
    slotProps: {
      htmlInput: {
        readOnly,
        'aria-describedby': error ? helperTextId : undefined,
        'aria-required': isRequired,
      },
      formHelperText: { id: helperTextId },
    },
  };

  if (column.type === 'checkbox') {
    return (
      <FormControl
        disabled={disabled}
        error={Boolean(error)}
        aria-required={isRequired}
      >
        <FormControlLabel
          label={renderRequiredFieldLabel(column.headerName, isRequired)}
          disabled={disabled}
          sx={{
            alignItems: 'center',
            marginLeft: -0.5,
            marginRight: 0,
            minHeight: 38,
            my: 0,
          }}
          control={
            <Checkbox
              checked={isGridCheckboxChecked(displayedValue)}
              disabled={disabled}
              size="small"
              slotProps={{
                input: {
                  readOnly,
                  'aria-describedby': error ? helperTextId : undefined,
                  'aria-invalid': Boolean(error),
                  'aria-required': isRequired,
                },
              }}
              onChange={(event) => {
                if (!readOnly && !disabled) applyValue(event.target.checked);
              }}
            />
          }
        />
        {error && <FormHelperText id={helperTextId}>{error}</FormHelperText>}
      </FormControl>
    );
  }

  if (column.type === 'select') {
    const multiple = Boolean(column.form?.multiple);
    const selectValue = multiple
      ? Array.isArray(displayedValue)
        ? displayedValue.map(String)
        : []
      : String(displayedValue ?? '');

    return (
      <TextField
        {...sharedTextFieldProps}
        select
        value={selectValue}
        slotProps={{
          ...sharedTextFieldProps.slotProps,
          select: { multiple, readOnly },
        }}
        onChange={(event) => {
          if (multiple) {
            const selectedValues = Array.isArray(event.target.value)
              ? event.target.value.map(String)
              : String(event.target.value).split(',');
            const values = selectedValues.map(
              (selectedValue) =>
                options.find((option) => String(option.value) === selectedValue)
                  ?.value ?? selectedValue,
            );
            applyValue(values);
            return;
          }
          const option = options.find(
            (candidate) => String(candidate.value) === event.target.value,
          );
          applyValue(option?.value ?? event.target.value);
        }}
      >
        {options.map((option) => (
          <MenuItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (column.type === 'user') {
    const multiple = Boolean(column.form?.multiple);
    const userValue = multiple
      ? Array.isArray(displayedValue)
        ? (displayedValue as Array<string | number>)
        : []
      : typeof displayedValue === 'string' || typeof displayedValue === 'number'
        ? displayedValue
        : null;

    return (
      <UserSelectEditor
        value={userValue}
        options={column.userOptions ?? []}
        multiple={multiple}
        label={column.headerName}
        readOnly={readOnly}
        disabled={disabled}
        required={isRequired}
        error={Boolean(error)}
        helperText={error}
        onChange={applyValue}
      />
    );
  }

  if (column.type === 'autocomplete') {
    const selectedOption = options.find((option) =>
      Object.is(option.value, displayedValue),
    );

    return (
      <Autocomplete
        fullWidth
        disabled={disabled}
        readOnly={readOnly}
        size="small"
        options={options}
        value={selectedOption ?? null}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, selected) =>
          Object.is(option.value, selected.value)
        }
        onChange={(_event, option: F1GridOption | null) =>
          applyValue(option?.value ?? '')
        }
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            disabled={disabled}
            label={renderRequiredFieldLabel(column.headerName, isRequired)}
            margin="none"
            size="small"
            required={false}
            error={Boolean(error)}
            helperText={error}
            sx={{
              '& .MuiInputBase-root': { minHeight: 38 },
              '& .MuiInputBase-input': { fontSize: '0.93rem' },
              '& .MuiInputLabel-root': {
                color: 'text.secondary',
                fontSize: '0.82rem',
                fontWeight: 600,
                opacity: 1,
              },
              '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
            }}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                readOnly,
                'aria-describedby': error ? helperTextId : undefined,
                'aria-required': isRequired,
              },
              formHelperText: { id: helperTextId },
            }}
          />
        )}
      />
    );
  }

  if (column.type === 'code') {
    const openCodePicker = () => {
      const mergedPatch: Partial<T> = {};
      const returnedPatch = column.onOpenCodePicker?.(row, (patch) => {
        Object.assign(mergedPatch, patch);
      });
      if (returnedPatch) Object.assign(mergedPatch, returnedPatch);
      if (Object.keys(mergedPatch).length > 0) onPatch(mergedPatch);
    };

    return (
      <TextField
        {...sharedTextFieldProps}
        value={String(displayedValue ?? '')}
        slotProps={{
          ...sharedTextFieldProps.slotProps,
          htmlInput: {
            ...sharedTextFieldProps.slotProps.htmlInput,
            readOnly: true,
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={`${column.headerName} 선택`}>
                  <span>
                    <IconButton
                      aria-label={`${column.headerName} 선택`}
                      disabled={readOnly || disabled || !column.onOpenCodePicker}
                      edge="end"
                      onClick={openCodePicker}
                      size="small"
                      sx={{ p: 0.75 }}
                    >
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    );
  }

  const isNumber =
    column.type === 'number' ||
    column.type === 'decimal' ||
    column.type === 'currency';
  const inputType = isNumber
    ? 'number'
    : column.type === 'datetime'
      ? 'datetime-local'
      : column.type === 'date' || column.type === 'time'
        ? column.type
        : 'text';
  const normalizedDisplayValue =
    isNumber && displayedValue !== null && displayedValue !== undefined
      ? normalizeGridNumberInput(String(displayedValue), column.decimalPlaces)
      : displayedValue;

  return (
    <TextField
      {...sharedTextFieldProps}
      type={inputType}
      inputRef={inputRef}
      // 송연(2026-10-28): 날짜·시간 칸은 이름표를 늘 위로 올린다(브라우저 '연도-월-일' 안내와 겹치지 않게). S_ERP F1-Grid에는 없는 줄
      slotProps={
        inputType === 'date' || inputType === 'time' || inputType === 'datetime-local'
          ? { ...sharedTextFieldProps.slotProps, inputLabel: { shrink: true } }
          : sharedTextFieldProps.slotProps
      }
      value={
        normalizedDisplayValue == null ? '' : String(normalizedDisplayValue)
      }
      onChange={(event) => {
        if (!isNumber) {
          handleFormattedChange(event);
          return;
        }
        const nextTextValue = isNumber
          ? normalizeGridNumberInput(event.target.value, column.decimalPlaces)
          : event.target.value;
        const nextValue =
          isNumber && nextTextValue !== ''
            ? Number(nextTextValue)
            : nextTextValue;
        applyValue(nextValue);
      }}
    />
  );
}
