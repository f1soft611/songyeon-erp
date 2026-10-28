import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageSearchArea } from '../src/shared/components/PageSearchArea';
import type { PageSearchField } from '../src/shared/components/page-search/searchFields';

describe('PageSearchArea 상세 검색', () => {
  const fields: PageSearchField[] = [
    { field: 'name', label: '이름', type: 'text', searchSpan: 2 },
    { field: 'createdAt', label: '생성일', type: 'date', searchSpan: 3 },
    {
      field: 'status',
      label: '상태',
      type: 'select',
      searchSpan: 1,
      options: [{ value: 'Y', label: '사용' }],
    },
  ];

  it('상세 오버레이에서 타입별 필드를 입력하고 검색할 수 있다', () => {
    const onDetailSearch = vi.fn();
    const onDetailValuesChange = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={onDetailValuesChange}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toBeVisible();
    expect(screen.getByLabelText('생성일 시작일')).toBeVisible();
    expect(screen.getByLabelText('생성일 종료일')).toBeVisible();
    expect(screen.getByRole('combobox', { name: '상태' })).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '공통' },
    });
    fireEvent.change(screen.getByLabelText('생성일 시작일'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '2026-12-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(onDetailValuesChange).toHaveBeenCalled();
    expect(onDetailSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '공통',
        createdAt: { from: '2026-01-01', to: '2026-12-31' },
      }),
    );
    expect(
      screen.queryByRole('button', { name: '검색 닫기' }),
    ).not.toBeInTheDocument();
  });

  it('상세 검색 필드와 하단 액션 사이에 가로 구분선을 표시한다', () => {
    render(
      <PageSearchArea detailFields={fields}>
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(
      screen.getByRole('separator', { orientation: 'horizontal' }),
    ).toBeVisible();
  });

  it('검색 닫기는 조회하지 않고 오버레이만 닫는다', () => {
    const onDetailSearch = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={vi.fn()}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    expect(onDetailSearch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: '검색 닫기' }),
    ).not.toBeInTheDocument();
  });

  it('초기화는 입력값을 비우고 상세 검색창을 유지한다', () => {
    const onDetailValuesChange = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={onDetailValuesChange}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '공통' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('');
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();
    expect(onDetailValuesChange).toHaveBeenLastCalledWith({});
  });
});
