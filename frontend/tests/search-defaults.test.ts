import { describe, expect, it, vi } from 'vitest';
import type { PageSearchField } from '../src/shared/components/page-search/searchFields';
import { resolvePageSearchDefaults } from '../src/shared/components/page-search/searchDefaults';

describe('resolvePageSearchDefaults', () => {
  it('resolves fixed and relative dates and requests system date once', async () => {
    const getToday = vi.fn().mockResolvedValue('2026-03-31');
    const fields: PageSearchField[] = [
      {
        field: 'submittedAt',
        label: '결재신청일',
        type: 'date',
        searchSpan: 2,
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
      {
        field: 'fixedRange',
        label: '고정기간',
        type: 'date',
        searchSpan: 2,
        defaultValue: {
          from: { type: 'fixed', year: 2026, month: 1, day: 1 },
        },
      },
    ];

    await expect(resolvePageSearchDefaults(fields, getToday)).resolves.toEqual({
      submittedAt: { from: '2026-02-28', to: '2026-03-31' },
      fixedRange: { from: '2026-01-01', to: '' },
    });
    expect(getToday).toHaveBeenCalledTimes(1);
  });

  it('does not request system date for fixed defaults', async () => {
    const getToday = vi.fn();
    const fields: PageSearchField[] = [
      {
        field: 'createdAt',
        label: '생성일',
        type: 'date',
        searchSpan: 1,
        defaultValue: {
          from: { type: 'fixed', year: 2024, month: 2, day: 29 },
        },
      },
    ];

    await expect(resolvePageSearchDefaults(fields, getToday)).resolves.toEqual({
      createdAt: { from: '2024-02-29', to: '' },
    });
    expect(getToday).not.toHaveBeenCalled();
  });

  it('clamps a year offset from leap day to the target month end', async () => {
    const fields: PageSearchField[] = [
      {
        field: 'dateRange',
        label: '기간',
        type: 'date',
        searchSpan: 1,
        defaultValue: {
          from: { type: 'systemDate', offset: { years: -1 } },
          to: { type: 'systemDate', offset: { days: -1 } },
        },
      },
    ];

    await expect(
      resolvePageSearchDefaults(fields, async () => '2024-02-29'),
    ).resolves.toEqual({
      dateRange: { from: '2023-02-28', to: '2024-02-28' },
    });
  });

  it('rejects impossible fixed dates', async () => {
    const fields: PageSearchField[] = [
      {
        field: 'dateRange',
        label: '기간',
        type: 'date',
        searchSpan: 1,
        defaultValue: {
          from: { type: 'fixed', year: 2026, month: 2, day: 30 },
        },
      },
    ];

    await expect(resolvePageSearchDefaults(fields)).rejects.toThrow(
      'Invalid date default',
    );
  });

  it('rejects non-integer offsets and defaults on non-date fields', async () => {
    const invalidOffset: PageSearchField[] = [
      {
        field: 'dateRange',
        label: '기간',
        type: 'date',
        searchSpan: 1,
        defaultValue: {
          from: { type: 'systemDate', offset: { months: 0.5 } },
        },
      },
    ];
    const nonDateDefault: PageSearchField[] = [
      {
        field: 'name',
        label: '이름',
        type: 'text',
        searchSpan: 1,
        defaultValue: {
          from: { type: 'fixed', year: 2026, month: 1, day: 1 },
        },
      },
    ];

    await expect(resolvePageSearchDefaults(invalidOffset)).rejects.toThrow(
      'Invalid date offset',
    );
    await expect(resolvePageSearchDefaults(nonDateDefault)).rejects.toThrow(
      'Date defaults require a date search field',
    );
  });

  it('rejects invalid system date responses', async () => {
    const fields: PageSearchField[] = [
      {
        field: 'dateRange',
        label: '기간',
        type: 'date',
        searchSpan: 1,
        defaultValue: { to: { type: 'systemDate' } },
      },
    ];

    await expect(
      resolvePageSearchDefaults(fields, async () => '2026-02-30'),
    ).rejects.toThrow('Invalid system date');
  });
});
