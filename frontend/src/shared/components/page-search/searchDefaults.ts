import dayjs from 'dayjs';
import type {
  F1GridDateDefault,
  F1GridDateRangeDefault,
} from '../f1-grid/types/grid.types';
import type {
  PageSearchField,
  PageSearchFieldValue,
} from './searchFields';
import { getSystemDate, isIsoDate } from '../../services/systemDateService';

type GetToday = () => Promise<string>;
type F1GridDateOffset = {
  years?: number;
  months?: number;
  days?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasDefaultValue(
  field: PageSearchField,
): field is PageSearchField & { defaultValue: F1GridDateRangeDefault } {
  return field.defaultValue !== undefined;
}

function formatFixedDate(
  date: Extract<F1GridDateDefault, { type: 'fixed' }>,
): string {
  const { year, month, day } = date;
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1
  ) {
    throw new Error('Invalid date default.');
  }

  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!isIsoDate(value)) {
    throw new Error('Invalid date default.');
  }
  return value;
}

function validateOffset(offset: unknown): asserts offset is F1GridDateOffset {
  if (!isRecord(offset)) {
    throw new Error('Invalid date offset.');
  }
  const allowedKeys = new Set(['years', 'months', 'days']);
  for (const [key, value] of Object.entries(offset)) {
    if (
      !allowedKeys.has(key) ||
      (value !== undefined &&
        (typeof value !== 'number' || !Number.isInteger(value)))
    ) {
      throw new Error('Invalid date offset.');
    }
  }
}

function validateDateDefault(
  dateDefault: unknown,
): asserts dateDefault is F1GridDateDefault | undefined {
  if (dateDefault === undefined) return;
  if (!isRecord(dateDefault)) {
    throw new Error('Invalid date default.');
  }
  if (
    dateDefault.type === 'fixed' &&
    typeof dateDefault.year === 'number' &&
    typeof dateDefault.month === 'number' &&
    typeof dateDefault.day === 'number'
  ) {
    formatFixedDate({
      type: 'fixed',
      year: dateDefault.year,
      month: dateDefault.month,
      day: dateDefault.day,
    });
    return;
  }
  if (dateDefault.type === 'systemDate') {
    validateOffset(
      dateDefault.offset === undefined ? {} : dateDefault.offset,
    );
    return;
  }
  throw new Error('Invalid date default.');
}

function validateDateRangeDefault(
  defaults: unknown,
): asserts defaults is F1GridDateRangeDefault {
  if (!isRecord(defaults)) {
    throw new Error('Invalid date default.');
  }
  const allowedKeys = new Set(['from', 'to']);
  if (Object.keys(defaults).some((key) => !allowedKeys.has(key))) {
    throw new Error('Invalid date default.');
  }
  validateDateDefault(defaults.from);
  validateDateDefault(defaults.to);
}

function usesSystemDate(defaultValue: F1GridDateRangeDefault): boolean {
  return [defaultValue.from, defaultValue.to].some(
    (date) => date?.type === 'systemDate',
  );
}

function resolveDateDefault(
  dateDefault: F1GridDateDefault | undefined,
  today: string | undefined,
): string {
  if (!dateDefault) return '';
  if (dateDefault.type === 'fixed') return formatFixedDate(dateDefault);
  if (dateDefault.type !== 'systemDate') {
    throw new Error('Invalid date default.');
  }

  const offset = dateDefault.offset ?? {};
  if (!today || !isIsoDate(today)) {
    throw new Error('Invalid system date.');
  }

  return dayjs(today)
    .add(offset.years ?? 0, 'year')
    .add(offset.months ?? 0, 'month')
    .add(offset.days ?? 0, 'day')
    .format('YYYY-MM-DD');
}

export async function resolvePageSearchDefaults(
  fields: PageSearchField[],
  getToday: GetToday = getSystemDate,
): Promise<Record<string, PageSearchFieldValue>> {
  const configuredFields = fields.filter(hasDefaultValue);
  for (const field of configuredFields) {
    if (field.type !== 'date') {
      throw new Error('Date defaults require a date search field.');
    }
    validateDateRangeDefault(field.defaultValue);
  }

  const needsSystemDate = configuredFields.some((field) =>
    usesSystemDate(field.defaultValue),
  );
  const today = needsSystemDate ? await getToday() : undefined;
  if (needsSystemDate && (!today || !isIsoDate(today))) {
    throw new Error('Invalid system date.');
  }

  return configuredFields.reduce<Record<string, PageSearchFieldValue>>(
    (values, field) => {
      const defaults = field.defaultValue;
      values[field.field] = {
        from: resolveDateDefault(defaults.from, today),
        to: resolveDateDefault(defaults.to, today),
      };
      return values;
    },
    {},
  );
}
