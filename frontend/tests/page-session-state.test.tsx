import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageSessionState } from '../src/shared/hooks/usePageSessionState';

function SessionStateProbe() {
  const { state, resetState } = usePageSessionState(
    'songyeon-erp:recent-menu-history',
    [{ menuId: 'home' }],
  );

  return (
    <>
      <output data-testid="state">{JSON.stringify(state)}</output>
      <button type="button" onClick={resetState}>
        reset
      </button>
    </>
  );
}

function VersionedSessionStateProbe() {
  const { state } = usePageSessionState(
    'versioned-page',
    { searchQuery: '' },
    {
      version: 2,
      validate: (value): value is { searchQuery: string } =>
        Boolean(
          value &&
          typeof value === 'object' &&
          'searchQuery' in value &&
          typeof value.searchQuery === 'string',
        ),
    },
  );

  return <output data-testid="versioned-state">{JSON.stringify(state)}</output>;
}

describe('page session state', () => {
  it('clears the persisted recent-menu state when reset', () => {
    window.sessionStorage.setItem(
      'songyeon-erp:recent-menu-history',
      JSON.stringify([{ menuId: 'documents' }]),
    );

    render(<SessionStateProbe />);
    expect(screen.getByTestId('state')).toHaveTextContent('documents');

    act(() => {
      screen.getByRole('button', { name: 'reset' }).click();
    });

    expect(screen.getByTestId('state')).toHaveTextContent('home');
    expect(
      window.sessionStorage.getItem('songyeon-erp:recent-menu-history'),
    ).toBeNull();
  });

  it('ignores invalid or stale persisted page state', () => {
    window.sessionStorage.setItem(
      'versioned-page',
      JSON.stringify({ version: 1, value: { searchQuery: 'stale' } }),
    );

    render(<VersionedSessionStateProbe />);

    expect(screen.getByTestId('versioned-state')).toHaveTextContent(
      '{"searchQuery":""}',
    );
    expect(window.sessionStorage.getItem('versioned-page')).toBe(
      JSON.stringify({ version: 2, value: { searchQuery: '' } }),
    );
  });
});
