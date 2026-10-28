import { afterEach, describe, expect, it, vi } from 'vitest';

import { shiftDate, tvDateTitle, tvTotal } from '../src/shared/components/TvScheduleBoard';
import { apiGetPublic } from '../src/shared/services/apiClient';

describe('현장 TV 화면(송연 TvScheduleBoard)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('어제·오늘·내일 날짜와 머리 글자', () => {
    expect(shiftDate('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(tvDateTitle('2026-10-06')).toBe('10월 6일 (화)');
  });

  it('칸 위 합계: 건수 · 수량 합(kg)', () => {
    expect(tvTotal([{ orderQty: '1,000kg' }, { orderQty: '135' }, { orderQty: null }])).toBe('3건 · 1,135.00kg');
    expect(tvTotal([])).toBe('0건 · 0.00kg');
  });

  it('공개 조회는 로그인 정보가 없어도 로그인 화면으로 보내지 않고, 토큰도 붙이지 않는다', async () => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/tv/logistics');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ resultCode: 200, result: { resultList: [{ clientName: 'A' }] } })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await apiGetPublic<{ resultList: { clientName: string }[] }>('/api/v1/tv/logistics?date=2026-10-06');
    expect(result.resultList[0].clientName).toBe('A');
    expect(window.location.pathname).toBe('/tv/logistics');
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(Object.keys((init.headers ?? {}) as Record<string, string>)).not.toContain('Authorization');
  });

  it('공개 조회도 서버가 거절하면(900 등) 그 문구로 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ resultCode: 900, resultMessage: 'date 파라미터가 필요합니다' }))));
    await expect(apiGetPublic('/api/v1/tv/production')).rejects.toThrow('date 파라미터가 필요합니다');
  });
});
