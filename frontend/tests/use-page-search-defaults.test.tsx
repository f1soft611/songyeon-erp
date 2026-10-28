import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageSearchField } from '../src/shared/components/page-search/searchFields';
import { getSystemDate } from '../src/shared/services/systemDateService';
import { usePageSearchDefaults } from '../src/shared/hooks/usePageSearchDefaults';

vi.mock('../src/shared/services/systemDateService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/shared/services/systemDateService')>();
  return { ...actual, getSystemDate: vi.fn() };
});

const mockedGetSystemDate = vi.mocked(getSystemDate);

const fields: PageSearchField[] = [
  {
    field: 'fixedRange',
    label: '고정 기간',
    type: 'date',
    searchSpan: 1,
    defaultValue: {
      from: { type: 'fixed', year: 2026, month: 1, day: 1 },
    },
  },
  {
    field: 'systemRange',
    label: '시스템 기간',
    type: 'date',
    searchSpan: 1,
    defaultValue: { to: { type: 'systemDate' } },
  },
];

describe('usePageSearchDefaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads defaults and avoids the date API when only fixed defaults exist', async () => {
    const fixedFields = fields.slice(0, 1);
    const { result } = renderHook(() => usePageSearchDefaults(fixedFields));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.values).toEqual({
      fixedRange: { from: '2026-01-01', to: '' },
    });
    expect(mockedGetSystemDate).not.toHaveBeenCalled();
  });

  it('exposes an error and retries failed system-date resolution', async () => {
    mockedGetSystemDate
      .mockRejectedValueOnce(new Error('system date unavailable'))
      .mockResolvedValueOnce('2026-10-20');
    const { result } = renderHook(() => usePageSearchDefaults(fields));

    await waitFor(() =>
      expect(result.current.error).toBe('system date unavailable'),
    );
    expect(result.current.values).toBeNull();

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.values).toEqual({
      fixedRange: { from: '2026-01-01', to: '' },
      systemRange: { from: '', to: '2026-10-20' },
    });
    expect(mockedGetSystemDate).toHaveBeenCalledTimes(2);
  });
});
