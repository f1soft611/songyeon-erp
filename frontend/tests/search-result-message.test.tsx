import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchResultMessage } from '../src/shared/components/SearchResultMessage';

describe('shared search result message', () => {
  it('shows a dismissible empty-result status without a reset action', () => {
    render(<SearchResultMessage resultCount={0} />);

    const message = screen.getByRole('status');
    expect(message).toHaveTextContent(
      '조회 결과가 없습니다. 조회 기간을 넓히거나 검색 조건을 변경해 주세요.',
    );
    expect(within(message).getByRole('button', { name: 'Close' })).toBeVisible();
    expect(
      within(message).queryByRole('button', { name: '검색 조건 초기화' }),
    ).not.toBeInTheDocument();
    expect(message).toHaveClass('MuiAlert-colorInfo');
  });

  it('formats positive counts and hides after the close action', () => {
    render(<SearchResultMessage resultCount={1234} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '조회 결과 총 1,234건입니다.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
