import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';
import { normalizeGridNumberInput } from '../utils/grid.utils';

type NumberEditorProps = {
  value: string;
  decimalPlaces?: number;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
};

export function NumberEditor({
  value,
  decimalPlaces,
  onChange,
  onKeyDown,
  selectOnFocus = true,
}: NumberEditorProps) {
  const normalizedValue = normalizeGridNumberInput(value, decimalPlaces);

  return (
    <InputBase
      autoFocus
      fullWidth
      type="number"
      inputMode="numeric"
      value={normalizedValue}
      onChange={(event) =>
        onChange(normalizeGridNumberInput(event.target.value, decimalPlaces))
      }
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        if (!selectOnFocus) return;
        const input =
          (event.currentTarget as HTMLElement | null)?.querySelector('input') ??
          (event.target instanceof HTMLInputElement ? event.target : null);
        if (!(input instanceof HTMLInputElement) || input.value.length === 0) {
          return;
        }

        try {
          if (
            typeof input.selectionStart !== 'number' ||
            typeof input.selectionEnd !== 'number'
          ) {
            Object.defineProperty(input, 'selectionStart', {
              configurable: true,
              get: () => 0,
              set: () => undefined,
            });
            Object.defineProperty(input, 'selectionEnd', {
              configurable: true,
              get: () => input.value.length,
              set: () => undefined,
            });
          }

          input.focus();
          input.select();
          if (typeof input.setSelectionRange === 'function') {
            try {
              input.setSelectionRange(0, input.value.length);
            } catch {
              // Number inputs can reject selection range APIs in jsdom/browser gaps.
            }
          }
        } catch {
          // Ignore invalid state on wrapped MUI inputs.
        }
      }}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontSize: 'inherit',
        bgcolor: 'background.paper',
        '& .MuiInputBase-input': {
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          paddingTop: 0,
          paddingBottom: 0,
          font: 'inherit',
        },
      }}
    />
  );
}
