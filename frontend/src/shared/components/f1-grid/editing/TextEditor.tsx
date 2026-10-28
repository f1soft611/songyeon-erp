import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';
import type { F1GridInputFormat } from '../types/grid.types';
import { useF1GridFormattedInput } from './useF1GridFormattedInput';

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
  inputFormat?: F1GridInputFormat;
  sanitizeInput?: (value: string) => string;
};

export function TextEditor({
  value,
  onChange,
  onKeyDown,
  selectOnFocus = true,
  inputFormat,
  sanitizeInput,
}: TextEditorProps) {
  const { inputRef, handleChange } = useF1GridFormattedInput({
    value,
    inputFormat,
    sanitizeInput,
    onChange,
  });

  return (
    <InputBase
      autoFocus
      fullWidth
      value={value}
      inputRef={inputRef}
      onChange={handleChange}
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
          input.setSelectionRange(0, input.value.length);
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
