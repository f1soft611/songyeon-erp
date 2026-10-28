import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPut: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);
import { fetchLoginPopups, fetchLoginPopupDetail, dismissLoginPopupToday } from '../src/pages/groupware/community/notice/services/noticeLoginPopupService';

beforeEach(() => vi.clearAllMocks());
describe('notice login popup API', () => {
  it('uses a dedicated uncounted queue and scoped detail/dismiss endpoints', async () => {
    api.apiGet.mockResolvedValueOnce({ resultList: [{ postId: 42 }] })
      .mockResolvedValueOnce({ item: { postId: 42, loginPopupYn: 'Y', popupEndDate: '2026-10-31' } });
    expect(await fetchLoginPopups()).toEqual([{ postId: 42 }]);
    expect(await fetchLoginPopupDetail(42)).toMatchObject({ postId: 42 });
    await dismissLoginPopupToday(42);
    expect(api.apiGet).toHaveBeenNthCalledWith(1, '/api/v1/groupware/boards/notice/login-popups');
    expect(api.apiGet).toHaveBeenNthCalledWith(2, '/api/v1/groupware/boards/notice/login-popups/42');
    expect(api.apiPut).toHaveBeenCalledWith('/api/v1/groupware/boards/notice/login-popups/42/dismiss-today', {});
  });
  it('does not convert malformed list or detail responses to a successful empty queue', async () => {
    for (const response of [{}, { resultList: [{ postId: -1 }] }, { resultList: 'invalid' }]) {
      api.apiGet.mockResolvedValueOnce(response);
      await expect(fetchLoginPopups()).rejects.toThrow('응답');
    }
    api.apiGet.mockResolvedValueOnce({ item: { postId: 8 } });
    await expect(fetchLoginPopupDetail(42)).rejects.toThrow('응답');
  });
});
