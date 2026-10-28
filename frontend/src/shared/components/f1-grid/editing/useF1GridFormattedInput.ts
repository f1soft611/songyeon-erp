import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
} from 'react';
import type { F1GridInputFormat } from '../types/grid.types';
import {
  mapF1GridInputSelection,
  normalizeF1GridInput,
} from './inputFormat';

type UseF1GridFormattedInputOptions = {
  value: string;
  inputFormat?: F1GridInputFormat;
  sanitizeInput?: (value: string) => string;
  onChange: (value: string) => void;
};

type FormattedInputElement = HTMLInputElement | HTMLTextAreaElement;

export function useF1GridFormattedInput({
  value,
  inputFormat,
  sanitizeInput,
  onChange,
}: UseF1GridFormattedInputOptions) {
  const inputRef = useRef<FormattedInputElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelection.current;
    if (!input || !selection) return;

    input.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  const handleChange = useCallback(
    (event: ChangeEvent<FormattedInputElement>) => {
      const input = event.currentTarget;
      const rawValue = input.value;
      const formattedValue = normalizeF1GridInput(
        rawValue,
        inputFormat,
        sanitizeInput,
      );

      if (inputFormat) {
        const start = mapF1GridInputSelection(
          rawValue,
          formattedValue,
          input.selectionStart,
        );
        const end = mapF1GridInputSelection(
          rawValue,
          formattedValue,
          input.selectionEnd,
        );
        if (start !== null && end !== null) {
          pendingSelection.current = { start, end };
        }
      }

      onChange(formattedValue);
    },
    [inputFormat, onChange, sanitizeInput],
  );

  return { inputRef, handleChange };
}
