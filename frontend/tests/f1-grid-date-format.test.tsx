import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  F1Grid,
  getCellDisplayValue,
  type F1GridColumn,
  type F1GridRef,
} from '../src/shared/components/f1-grid';
import { createDocumentStatusColumns } from '../src/pages/groupware/documents/status/components/DocumentStatusGrid';
import { getGridDateValue } from '../src/shared/components/f1-grid/utils/grid.utils';

type Row = { id: string; date: string | Date | null | undefined };
type NumericRow = { id: string; amount: number };

const column: F1GridColumn<Row> = {
  field: 'date',
  headerName: 'Date',
  type: 'date',
};
const numberColumn: F1GridColumn<NumericRow> = {
  field: 'amount',
  headerName: 'Amount',
  type: 'number',
};

describe('F1-GRID date formatting', () => {
  it.each([
    ['2026-10-20', 2026, 9, 20],
    ['2026-10-20T00:30:00+14:00', 2026, 9, 20],
    ['20261020', 2026, 9, 20],
    [new Date(2026, 9, 20, 15, 30), 2026, 9, 20],
  ])('parses %s as a timezone-stable date-only value', (value, year, month, day) => {
    const parsed = getGridDateValue(value);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(year);
    expect(parsed?.getMonth()).toBe(month);
    expect(parsed?.getDate()).toBe(day);
    expect(parsed?.getHours()).toBe(0);
  });

  it.each([null, undefined, '', '2026-02-29', 'not-a-date'])(
    'does not parse empty or invalid date value %s',
    (value) => {
      expect(getGridDateValue(value)).toBeUndefined();
    },
  );

  it.each([
    ['2026-10-20', '2026-10-20'],
    ['2026-10-20T09:21:00', '2026-10-20'],
    ['2026-10-20 09:21:00', '2026-10-20'],
    ['2026-10-20T00:30:00+14:00', '2026-10-20'],
    ['20261020', '2026-10-20'],
    ['2024-02-29', '2024-02-29'],
    [new Date(2026, 9, 20), '2026-10-20'],
  ])('uses the default date format for %s', (value, expected) => {
    expect(getCellDisplayValue(column, value)).toBe(expected);
  });

  it.each([
    ['yyyy/mm/dd', '2026/01/05'],
    ['dd.mm.yyyy', '05.01.2026'],
    ['YYYY/MM/DD', '2026/01/05'],
    ['yy-m-d', '26-1-5'],
    ['[day] dd [month] mm', 'day 05 month 01'],
    ['', '2026-01-05'],
  ])('supports the %s display format', (format, expected) => {
    expect(
      getCellDisplayValue({ ...column, format }, '2026-01-05T09:21:00'),
    ).toBe(expected);
  });

  it.each([null, undefined, ''])('keeps %s empty', (value) => {
    expect(getCellDisplayValue(column, value)).toBe('');
  });

  it.each(['not-a-date', '2026-02-29', '2026-04-31', '2026-13-01'])(
    'preserves invalid date text %s instead of normalizing it',
    (value) => {
      expect(getCellDisplayValue(column, value)).toBe(value);
    },
  );

  it('applies the default to both document status date columns', () => {
    const dateColumns = createDocumentStatusColumns().filter(
      (item) => item.type === 'date',
    );
    expect(dateColumns.map((item) => item.field)).toEqual([
      'submittedAt',
      'updatedAt',
    ]);
    for (const item of dateColumns) {
      expect(getCellDisplayValue(item, '2026-10-20T09:21:00')).toBe('2026-10-20');
    }
  });

  it('renders a custom date while editing and retaining the original value', () => {
    const ref = createRef<F1GridRef<Row>>();
    const rows: Row[] = [{ id: '1', date: '2026-01-05' }];
    render(
      <F1Grid
        ref={ref}
        rowKey="id"
        rows={rows}
        columns={[{ ...column, format: 'yyyy/mm/dd', editable: true }]}
      />,
    );

    const cell = screen.getByRole('gridcell', { name: '2026/01/05' });
    fireEvent.doubleClick(cell);
    expect(screen.getByRole('textbox')).toHaveValue('2026-01-05');
    expect(rows[0].date).toBe('2026-01-05');
    expect(ref.current?.getChanges().updatedRows).toEqual([]);
  });

  it('preserves numeric, datetime and time formatting', () => {
    expect(
      getCellDisplayValue(
        {
          field: 'amount',
          headerName: 'Amount',
          type: 'number',
          format: 'number',
          decimalPlaces: 2,
        },
        12345.6,
      ),
    ).toBe('12,345.60');
    expect(
      getCellDisplayValue(
        {
          field: 'amount',
          headerName: 'Amount',
          type: 'currency',
          format: 'currency',
        },
        12345.6,
      ),
    ).toBe(
      new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
      }).format(12345.6),
    );
    expect(
      getCellDisplayValue(
        { ...column, type: 'datetime' },
        '2026-10-20T09:21:00',
      ),
    ).toBe('2026-10-20T09:21:00');
    expect(
      getCellDisplayValue({ ...column, type: 'time' }, '09:21'),
    ).toBe('09:21');
  });

  it('shows up to five optional fractional digits for number and decimal columns', () => {
    expect(
      [1, 1.2, 1.2345, 1.234567].map((value) =>
        getCellDisplayValue(numberColumn, value),
      ),
    ).toEqual(['1', '1.2', '1.2345', '1.23457']);
    expect(
      getCellDisplayValue({ ...numberColumn, type: 'decimal' }, 1.234567),
    ).toBe('1.23457');
  });

  it('keeps explicitly configured decimal places fixed', () => {
    expect(
      getCellDisplayValue({ ...numberColumn, decimalPlaces: 2 }, 1.2),
    ).toBe('1.20');
  });

  it('renders numeric cells with five optional decimal places', () => {
    render(
      <F1Grid
        rowKey="id"
        rows={[
          { id: 'integer', amount: 1 },
          { id: 'fractional', amount: 1.234567 },
        ]}
        columns={[numberColumn]}
      />,
    );

    expect(screen.getByRole('gridcell', { name: '1' })).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', { name: '1.23457' }),
    ).toBeInTheDocument();
  });
});
