import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageHeader } from '../src/shared/components/PageHeader';

describe('PageHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('설명 영역을 접고 펼친 상태를 브라우저에 저장한다', () => {
    const { unmount } = render(
      <PageHeader
        breadcrumbItems={['그룹웨어', '공지사항']}
        description="공지 설명"
      >
        <div>헤더 하단 영역</div>
      </PageHeader>,
    );

    expect(screen.getByText('공지 설명')).toBeVisible();
    const collapseButton = screen.getByRole('button', {
      name: /페이지 설명 접기/i,
    });
    expect(collapseButton.parentElement).toHaveTextContent('공지사항');
    fireEvent.click(collapseButton);

    expect(screen.queryByText('공지 설명')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('page-header-description-collapsed'),
    ).toBe('true');

    unmount();
    render(
      <PageHeader
        breadcrumbItems={['그룹웨어', '문서']}
        description="문서 설명"
      />,
    );

    expect(screen.queryByText('문서 설명')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /페이지 설명 열기/i }),
    ).toBeVisible();
  });
});
