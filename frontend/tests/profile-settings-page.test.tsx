import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSettingsPage from '../src/pages/dashboard/ProfileSettingsPage';
import * as profileService from '../src/pages/dashboard/services/profileSettings.service';

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.fetchMyProfile).mockResolvedValue({
      userId: 'admin',
      name: '사용자명',
      email: 'user@example.com',
      departmentName: '개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    });
    vi.mocked(profileService.updateMyProfile).mockResolvedValue({
      userId: 'admin',
      name: '사용자명',
      email: 'new@example.com',
      departmentName: '개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    });
  });

  it('loads and saves the authenticated profile email', async () => {
    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );

    const emailInput = await screen.findByLabelText(/이메일/i);
    expect(emailInput).toHaveValue('user@example.com');

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /저장/i }));

    await vi.waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalledWith({
        email: 'new@example.com',
        profileImage: null,
        stampImage: null,
      });
    });
  });

  // 2026-10-23 비밀번호 변경은 보안 설정 화면에서만 한다(S_ERP 와 같이 내 정보 관리에서는 뺐다)
  it('does not show password change fields', async () => {
    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText(/이메일/i);
    expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '비밀번호 변경' })).not.toBeInTheDocument();
  });
});
