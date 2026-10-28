import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { getSystemDate } from '../src/shared/services/systemDateService';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

const mockedApiGet = vi.mocked(apiGet);

describe('getSystemDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the server date from the common system date endpoint', async () => {
    mockedApiGet.mockResolvedValue({ today: '2026-10-20' });

    await expect(getSystemDate()).resolves.toBe('2026-10-20');
    expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/common/system-date');
  });

  it('rejects malformed and impossible server dates', async () => {
    mockedApiGet.mockResolvedValue({ today: '2026-02-30' });

    await expect(getSystemDate()).rejects.toThrow('Invalid system date');
  });
});
