import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const codeMocks = vi.hoisted(() => ({
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
}));

vi.mock(
  '../src/pages/co/master/common-code/services/commonCodeManagement.service',
  () => codeMocks,
);

import { useNoticeCategories } from '../src/pages/groupware/community/notice/hooks/useNoticeCategories';

describe('useNoticeCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    codeMocks.fetchCommonCodeGroups.mockResolvedValue([
      { id: 9, groupCode: 'NOTICE_GUBUN' },
      { id: 10, groupCode: 'OTHER' },
    ]);
    codeMocks.fetchCommonCodeItems.mockResolvedValue([
      { itemCode: 'OPS', itemNm: '운영', useAt: 'Y' },
      { itemCode: 'OLD', itemNm: '종료', useAt: 'N' },
    ]);
  });

  it('loads active notice categories and exposes a filter setter', async () => {
    const { result } = renderHook(() => useNoticeCategories());

    await waitFor(() =>
      expect(result.current.noticeGubunOptions).toHaveLength(1),
    );
    expect(result.current.noticeGubunOptions).toEqual([
      { code: 'OPS', name: '운영' },
    ]);
    expect(codeMocks.fetchCommonCodeItems).toHaveBeenCalledWith(9);
    act(() => result.current.setSelectedNoticeFilter('OPS'));
    expect(result.current.selectedNoticeFilter).toBe('OPS');
  });
});
