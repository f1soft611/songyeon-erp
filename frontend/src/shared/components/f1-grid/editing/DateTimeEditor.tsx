import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import type { KeyboardEvent } from 'react';

type DateTimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
};

const DATE_TIME_FORMAT = 'YYYY-MM-DD[T]HH:mm';

export function DateTimeEditor({
  value,
  onChange,
  onKeyDown,
  selectOnFocus = true,
}: DateTimeEditorProps) {
  const parsedValue = value ? dayjs(value, DATE_TIME_FORMAT) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        value={parsedValue}
        format={DATE_TIME_FORMAT}
        onChange={(nextValue) =>
          onChange(
            nextValue?.isValid() ? nextValue.format(DATE_TIME_FORMAT) : '',
          )
        }
        slotProps={{
          textField: {
            autoFocus: true,
            fullWidth: true,
            margin: 'none',
            variant: 'standard',
            onFocus: (event) => {
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
            },
            onKeyDown,
            slotProps: { input: { disableUnderline: true } },
            sx: {
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
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
