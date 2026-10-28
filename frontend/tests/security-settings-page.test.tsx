import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecuritySettingsPage from '../src/pages/dashboard/SecuritySettingsPage';
import * as profileService from '../src/pages/dashboard/services/profileSettings.service';
import * as authService from '../src/shared/services/authService';

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  changeMyPassword: vi.fn(),
}));

vi.mock('../src/shared/services/authService', () => ({
  logout: vi.fn(),
}));

describe('SecuritySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.changeMyPassword).mockResolvedValue();
  });

  it('requires matching new passwords before submitting', async () => {
    render(
      <MemoryRouter>
        <SecuritySettingsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/현재 비밀번호/i), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText(/^변경 비밀번호$/i), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText(/변경 비밀번호 확인/i), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /변경/i }));

    expect(await screen.findByText(/일치하지 않습니다/i)).toBeInTheDocument();
    expect(profileService.changeMyPassword).not.toHaveBeenCalled();
  });

  it('logs out and redirects after a successful password change', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/security']}>
        <SecuritySettingsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/현재 비밀번호/i), {
      target: { value: 'current-password' },
    });
    fireEvent.change(screen.getByLabelText(/^변경 비밀번호$/i), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText(/변경 비밀번호 확인/i), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /변경/i }));

    await vi.waitFor(() => {
      expect(profileService.changeMyPassword).toHaveBeenCalledWith({
        currentPassword: 'current-password',
        newPassword: 'new-password',
        newPasswordConfirm: 'new-password',
      });
      expect(authService.logout).toHaveBeenCalled();
    });
  });
});
