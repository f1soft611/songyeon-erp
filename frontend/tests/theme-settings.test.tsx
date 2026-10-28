import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('Theme settings', () => {
  it('lets the user switch theme and display size from icon-only dashboard header controls', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/로그인아이디/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    const themeButton = await screen.findByRole('button', {
      name: /테마 설정/i,
    });
    const displayScaleButton = await screen.findByRole('button', {
      name: /화면크기 설정/i,
    });

    expect(themeButton).toBeInTheDocument();
    expect(displayScaleButton).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /테마/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /화면크기/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(themeButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /다크 테마/i }));
    expect(window.localStorage.getItem('erp-theme')).toBe('dark');

    fireEvent.click(displayScaleButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /^크게$/i }));
    expect(window.localStorage.getItem('erp-display-scale')).toBe('1.2');
  });
});
