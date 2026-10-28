import type { F1GridInputFormat } from '../types/grid.types';

function formatDigitGroups(
  digits: string,
  groupSizes: number[],
  separator: string,
): string {
  const groups: string[] = [];
  let offset = 0;

  for (const size of groupSizes) {
    if (offset >= digits.length) break;
    groups.push(digits.slice(offset, offset + size));
    offset += size;
  }

  if (offset < digits.length) groups.push(digits.slice(offset));
  return groups.join(separator);
}

export function formatF1GridInput(
  value: string,
  inputFormat: F1GridInputFormat,
): string {
  const digits = value.replace(/\D/g, '');

  if (inputFormat.type === 'digits') {
    const cappedDigits =
      inputFormat.maxDigits === undefined
        ? digits
        : digits.slice(0, inputFormat.maxDigits);
    return formatDigitGroups(
      cappedDigits,
      inputFormat.groupSizes ?? [],
      inputFormat.separator ?? '-',
    );
  }

  const maxDigits = digits.startsWith('02')
    ? Math.min(inputFormat.maxDigits ?? 10, 10)
    : Math.min(inputFormat.maxDigits ?? 11, 11);
  const cappedDigits = digits.slice(0, maxDigits);
  const groupSizes =
    cappedDigits.startsWith('02')
      ? [2, cappedDigits.length >= 10 ? 4 : 3]
      : [3, cappedDigits.length >= 11 ? 4 : 3];

  return formatDigitGroups(cappedDigits, groupSizes, '-');
}

export function normalizeF1GridInput(
  value: string,
  inputFormat?: F1GridInputFormat,
  sanitizeInput?: (value: string) => string,
): string {
  if (inputFormat) return formatF1GridInput(value, inputFormat);
  return sanitizeInput?.(value) ?? value;
}

export function mapF1GridInputSelection(
  rawValue: string,
  formattedValue: string,
  selection: number | null,
): number | null {
  if (selection === null) return null;

  const digitCount = rawValue.slice(0, selection).replace(/\D/g, '').length;
  if (digitCount === 0) return 0;

  let seenDigits = 0;
  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) seenDigits += 1;
    if (seenDigits === digitCount) return index + 1;
  }

  return formattedValue.length;
}

function hasDigits(value: string): boolean {
  return value.replace(/\D/g, '').length > 0;
}

export function isF1GridInputDigitCountValid(
  value: string,
  inputFormat: F1GridInputFormat,
): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return true;

  if (inputFormat.type === 'digits') {
    if (!inputFormat.validDigitCounts?.length) return true;
    return inputFormat.validDigitCounts.includes(digits.length);
  }

  if (!hasDigits(value)) return true;
  if (digits.startsWith('02')) return digits.length === 9 || digits.length === 10;
  return digits.length === 10 || digits.length === 11;
}
