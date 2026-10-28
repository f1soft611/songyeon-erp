import { describe, expect, it } from 'vitest';
import {
  applyCommonCodeSearchSession,
  getCommonCodeInitialFilters,
  initialCommonCodePageSession,
} from '../src/pages/co/master/common-code/commonCodePageSession';

describe('common-code page search session', () => {
  it('uses the last successfully applied filters for the initial page query', () => {
    const session = applyCommonCodeSearchSession(initialCommonCodePageSession, {
      mode: 'detail',
      searchQuery: '',
      detailValues: {
        groupCode: 'LEVEL',
        groupNm: '',
        groupDc: '',
      },
      filters: { groupCode: 'LEVEL' },
    });

    expect(getCommonCodeInitialFilters(session)).toEqual({
      groupCode: 'LEVEL',
    });
  });

  it('keeps the latest applied search separate from draft values', () => {
    const session = applyCommonCodeSearchSession(initialCommonCodePageSession, {
      mode: 'default',
      searchQuery: '문서',
      detailValues: { groupCode: 'LEVEL' },
      filters: { keyword: '문서' },
    });

    expect(session.searchQuery).toBe('문서');
    expect(session.detailValues).toEqual({ groupCode: 'LEVEL' });
    expect(session.appliedFilters).toEqual({ keyword: '문서' });
    expect(session.searchMode).toBe('default');
  });
});
