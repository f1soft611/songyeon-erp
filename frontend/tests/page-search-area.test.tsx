import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageSearchArea } from '../src/shared/components/PageSearchArea';

describe('PageSearchArea', () => {
  it('기본 검색 필드를 한 줄로 표시하고 상세 검색 토글만 제공한다', () => {
    render(
      <PageSearchArea>
        <button type="button">검색 필드</button>
      </PageSearchArea>,
    );

    expect(screen.getByRole('button', { name: '검색 필드' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /검색 조건/i }),
    ).not.toBeInTheDocument();
  });

  it('기본 검색 필드에서 Enter를 누르면 조회 콜백을 호출한다', () => {
    const onDefaultSearch = vi.fn();

    render(
      <PageSearchArea onDefaultSearch={onDefaultSearch}>
        <input aria-label="기본 검색" />
      </PageSearchArea>,
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: '기본 검색' }), {
      key: 'Enter',
    });

    expect(onDefaultSearch).toHaveBeenCalledTimes(1);
  });
});
