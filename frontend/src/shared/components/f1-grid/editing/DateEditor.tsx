import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { IconButton, InputAdornment, Popover, TextField } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { useEffect, useState, type KeyboardEvent } from 'react';

type DateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
  autoFocus?: boolean;
  variant?: 'standard' | 'outlined';
  label?: string;
  onBlur?: () => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
};

const DATE_FORMAT = 'YYYY-MM-DD';

function buildIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedValue = dayjs(value, DATE_FORMAT);
  return parsedValue.isValid() && parsedValue.format(DATE_FORMAT) === value;
}

export function normalizeDateInput(input: string, now = dayjs()): string {
  const value = input.trim().replace(/[^\d-]/g, '');
  const baseYear = now.year();
  const baseMonth = now.month() + 1;
  let candidate = '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    candidate = value;
  } else if (/^\d{8}$/.test(value)) {
    candidate = buildIsoDate(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)),
      Number(value.slice(6)),
    );
  } else if (/^\d{6}$/.test(value)) {
    candidate = buildIsoDate(
      2000 + Number(value.slice(0, 2)),
      Number(value.slice(2, 4)),
      Number(value.slice(4)),
    );
  } else if (/^\d{4}$/.test(value)) {
    candidate = buildIsoDate(
      baseYear,
      Number(value.slice(0, 2)),
      Number(value.slice(2)),
    );
  } else if (/^\d{1,2}$/.test(value)) {
    candidate = buildIsoDate(baseYear, baseMonth, Number(value));
  } else {
    const monthDayMatch = value.match(/^(\d{1,2})-(\d{1,2})$/);
    if (monthDayMatch) {
      candidate = buildIsoDate(
        baseYear,
        Number(monthDayMatch[1]),
        Number(monthDayMatch[2]),
      );
    }
  }

  return isIsoDateString(candidate) ? candidate : '';
}

export function DateEditor({
  value,
  onChange,
  onKeyDown,
  selectOnFocus = true,
  autoFocus = true,
  variant = 'standard',
  label,
  onBlur,
  required,
  error,
  helperText,
}: DateEditorProps) {
  const [draftValue, setDraftValue] = useState(value);
  const [calendarAnchor, setCalendarAnchor] =
    useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const normalizedValue = normalizeDateInput(value);
  const parsedValue = normalizedValue
    ? dayjs(normalizedValue, DATE_FORMAT)
    : null;
  const calendarValue = parsedValue?.isValid() ? parsedValue : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TextField
        autoFocus={autoFocus}
        fullWidth
        size={variant === 'outlined' ? 'small' : undefined}
        margin="none"
        variant={variant}
        label={label}
        required={required}
        placeholder={variant === 'outlined' ? DATE_FORMAT : undefined}
        error={error}
        helperText={helperText}
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value
            .replace(/[^\d-]/g, '')
            .slice(0, 10);
          setDraftValue(nextValue);
          onChange(nextValue);
        }}
        onFocus={(event) => {
          if (!selectOnFocus) return;
          const input =
            (event.currentTarget as HTMLElement | null)?.querySelector('input') ??
            (event.target instanceof HTMLInputElement ? event.target : null);
          if (!(input instanceof HTMLInputElement) || input.value.length === 0) {
            return;
          }
          try {
            input.setSelectionRange(0, input.value.length);
          } catch {
            // Ignore invalid state on wrapped MUI inputs.
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        slotProps={{
          htmlInput: {
            'aria-label': label,
            ...(variant === 'outlined' ? { inputMode: 'numeric' } : {}),
          },
          ...(variant === 'outlined' ? { inputLabel: { shrink: true } } : {}),
          input: {
            ...(variant === 'standard' ? { disableUnderline: true } : {}),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={label ? `${label} 달력 열기` : '달력 열기'}
                  onClick={(event) => setCalendarAnchor(event.currentTarget)}
                >
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={
          variant === 'standard'
            ? {
                width: '100%',
                height: '100%',
                minHeight: 0,
                fontSize: 'inherit',
                bgcolor: 'background.paper',
                '& .MuiInputBase-root': {
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '0 !important',
                  padding: 0,
                  fontSize: 'inherit',
                  '&:before, &:after': {
                    borderBottom: '0 !important',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '0 4px',
                  lineHeight: 'normal',
                  height: 'auto',
                  minHeight: 0,
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  font: 'inherit',
                  fontSize: 'inherit',
                },
                '& .MuiInputAdornment-root': {
                  marginLeft: 0,
                },
              }
            : { minWidth: 0, '& .MuiInputBase-input': { minWidth: 0 } }
        }
      />
      <Popover
        open={Boolean(calendarAnchor)}
        anchorEl={calendarAnchor}
        onClose={() => setCalendarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <DateCalendar
          value={calendarValue}
          onChange={(nextValue) => {
            const nextDate = nextValue?.isValid()
              ? nextValue.format(DATE_FORMAT)
              : '';
            setDraftValue(nextDate);
            onChange(nextDate);
            setCalendarAnchor(null);
          }}
        />
      </Popover>
    </LocalizationProvider>
  );
}
