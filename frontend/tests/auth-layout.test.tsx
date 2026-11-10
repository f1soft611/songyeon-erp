import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthLayout from '../src/shared/components/layout/AuthLayout';

describe('AuthLayout', () => {
  it('keeps tall login content vertically scrollable inside the app shell', () => {
    render(
      <AuthLayout>
        <div>Login content</div>
      </AuthLayout>,
    );

    const layout = screen.getByRole('main');

    expect(layout).toHaveStyle({
      flex: '1 1 0%',
      minHeight: '0px',
      overflowY: 'auto',
    });
  });
});
