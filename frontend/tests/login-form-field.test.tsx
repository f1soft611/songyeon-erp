import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginFormField from '../src/shared/components/LoginFormField';

describe('LoginFormField', () => {
  it('associates a fixed label above a readable input control', () => {
    render(
      <LoginFormField
        label="사용자 ID"
        value=""
        onChange={() => undefined}
      />,
    );

    const label = screen.getByText('사용자 ID', { selector: 'label' });
    const input = screen.getByLabelText('사용자 ID');

    expect(label).toBeVisible();
    expect(label).toHaveClass('MuiTypography-root');
    expect(label).not.toHaveClass('MuiInputLabel-root');
    expect(label).toHaveAttribute('for', input.id);
    expect(
      Boolean(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });
});
