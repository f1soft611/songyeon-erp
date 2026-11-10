import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLoadingSpinner } from '../src/shared/components/AppLoadingSpinner';

describe('AppLoadingSpinner', () => {
  it('uses the default MUI indeterminate circle animation', () => {
    render(<AppLoadingSpinner />);

    const progressbar = screen.getByRole('progressbar');
    const injectedStyles = [
      ...document.querySelectorAll('style[data-emotion]'),
    ]
      .map((style) => style.textContent ?? '')
      .join('');

    expect(injectedStyles).toMatch(
      /MuiCircularProgress-circle\{[^}]*animation:animation-[^;]+;/,
    );
    expect(injectedStyles).toMatch(
      /@keyframes animation-[^{]+\{[^}]*stroke-dasharray:1px,200px;/,
    );
    expect(injectedStyles).not.toMatch(
      /MuiCircularProgress-circle\{[^}]*animation:none/,
    );
    expect(progressbar).toHaveClass('MuiCircularProgress-indeterminate');
  });

  it('uses the 34px size with a 2.4px default and supports a custom thickness', () => {
    render(
      <>
        <AppLoadingSpinner />
        <AppLoadingSpinner thickness={3.6} />
      </>,
    );

    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars).toHaveLength(2);
    for (const progressbar of progressbars) {
      expect(progressbar).toHaveStyle({ width: '34px', height: '34px' });
    }
    const defaultCircle = progressbars[0].querySelector('circle');
    const overrideCircle = progressbars[1].querySelector('circle');
    expect(defaultCircle).not.toBeNull();
    expect(overrideCircle).not.toBeNull();
    expect(defaultCircle).toHaveAttribute('stroke-width', '2.4');
    expect(overrideCircle).toHaveAttribute('stroke-width', '3.6');
  });

  it('forwards contextual size, color, and accessibility props', () => {
    render(
      <AppLoadingSpinner
        size={16}
        thickness={2.4}
        color="inherit"
        aria-label="저장 중"
      />,
    );

    const progressbar = screen.getByRole('progressbar', { name: '저장 중' });
    expect(progressbar).toHaveStyle({ width: '16px', height: '16px' });
    expect(progressbar).toHaveClass('MuiCircularProgress-colorInherit');
    expect(progressbar.querySelector('circle')).toHaveAttribute(
      'stroke-width',
      '2.4',
    );
  });
});
