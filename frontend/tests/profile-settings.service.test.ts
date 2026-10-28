import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../src/shared/services/apiClient';
import {
  changeMyPassword,
  fetchMyProfile,
  updateMyProfile,
} from '../src/pages/dashboard/services/profileSettings.service';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

describe('profileSettings.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the authenticated user profile', async () => {
    const profile = {
      userId: 'admin',
      name: '사용자명',
      email: 'user@example.com',
      departmentName: '개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    };
    vi.mocked(apiClient.apiGet).mockResolvedValue(profile);

    await expect(fetchMyProfile()).resolves.toEqual(profile);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/api/v1/users/me/profile');
  });

  it('updates only profile fields through the authenticated profile endpoint', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({});
    const payload = {
      email: 'new@example.com',
      profileImage: 'data:image/png;base64,profile',
      stampImage: null,
    };

    await updateMyProfile(payload);

    expect(apiClient.apiPut).toHaveBeenCalledWith(
      '/api/v1/users/me/profile',
      payload,
    );
  });

  it('changes the password without sending a target user id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({});
    const payload = {
      currentPassword: 'current-password',
      newPassword: 'new-password',
      newPasswordConfirm: 'new-password',
    };

    await changeMyPassword(payload);

    expect(apiClient.apiPut).toHaveBeenCalledWith(
      '/api/v1/users/me/password',
      payload,
    );
  });
});
