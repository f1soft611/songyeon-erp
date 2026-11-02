import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { useState } from 'react';
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

  it('sanitizes configured string search fields but leaves ordinary text unchanged', () => {
    const onSearch = vi.fn();
    const onValuesChange = vi.fn();
    const sanitizeInput = (value: string) => value.replace(/[^0-9-]/g, '');
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            sanitizeInput,
          },
          { field: 'customerName', label: '거래처명', type: 'text', searchSpan: 1 },
        ]}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });
    fireEvent.change(businessNo, { target: { value: 'AB012-3X' } });
    expect(businessNo).toHaveValue('012-3');
    expect(onValuesChange).toHaveBeenLastCalledWith({ businessNo: '012-3' });
    fireEvent.change(screen.getByRole('textbox', { name: '거래처명' }), {
      target: { value: 'Acme 12' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      businessNo: '012-3',
      customerName: 'Acme 12',
    });
  });

  it('formats detailed search values using the field input format', () => {
    const onValuesChange = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            inputFormat: { type: 'digits', groupSizes: [3, 2] },
          },
        ]}
        onDetailValuesChange={onValuesChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });
    fireEvent.change(businessNo, { target: { value: '1234567890' } });

    expect(businessNo).toHaveValue('123-45-67890');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-45-67890',
    });
  });

  it('caps detailed search values by max digits but keeps partial input', () => {
    const onValuesChange = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
          },
        ]}
        onDetailValuesChange={onValuesChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });

    fireEvent.change(businessNo, { target: { value: '123456789012' } });
    expect(businessNo).toHaveValue('123-45-67890');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-45-67890',
    });

    fireEvent.change(businessNo, { target: { value: '1234' } });
    expect(businessNo).toHaveValue('123-4');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-4',
    });
  });

  it.each([
    ['20261022', '2026-10-22'],
    ['261022', '2026-10-22'],
    ['1022', `${dayjs().year()}-10-22`],
    ['22', `${dayjs().format('YYYY-MM')}-22`],
    ['10-22', `${dayjs().year()}-10-22`],
    ['2024-02-29', '2024-02-29'],
  ])('날짜 %s를 blur에서 %s로 확정한다', (input, expected) => {
    const onChange = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailValuesChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    expect(start).toHaveAttribute('type', 'text');
    fireEvent.change(start, { target: { value: input } });
    fireEvent.blur(start);
    expect(start).toHaveValue(expected);
    expect(onChange).toHaveBeenLastCalledWith({
      createdAt: { from: expected, to: '' },
    });
  });

  it('blur 없이 조회해도 양쪽 날짜를 ISO로 정규화한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByLabelText('생성일 시작일'), {
      target: { value: '20261001' },
    });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '2026-10-01', to: '2026-10-22' },
    });
  });

  it('잘못된 날짜는 입력을 보존하고 오류를 표시하며 조회를 차단한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    expect(start).toHaveValue('20260230');
    expect(start).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('올바른 날짜를 입력하세요.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();
    fireEvent.change(start, { target: { value: '20240229' } });
    fireEvent.blur(start);
    expect(start).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '2024-02-29', to: '' },
    });
  });

  it('오류 날짜를 삭제하면 한쪽만 지정한 검색을 허용한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.change(start, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '20261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '', to: '2026-10-22' },
    });
  });

  it('초기화와 외부 ISO 날짜 복원은 날짜 오류도 해제한다', () => {
    const defaults = { createdAt: { from: '2026-10-01', to: '2026-10-22' } };
    const { rerender } = render(
      <PageSearchArea detailFields={fields} defaultValues={defaults} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(start).toHaveValue('2026-10-01');
    expect(start).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    rerender(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-09-01', to: '' } }}
      />,
    );
    expect(start).toHaveValue('2026-09-01');
    expect(start).toHaveAttribute('aria-invalid', 'false');
  });

  it('각 날짜의 달력을 열고 날짜 선택 결과를 ISO로 반영한다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-10-01', to: '' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '생성일 시작일 달력 열기' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '22', exact: true }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-10-22');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('');
  });

  it('controlled 폼에서 다른 날짜를 편집해도 기존 오류를 유지한다', () => {
    function ControlledSearch() {
      const [values, setValues] = useState({});
      return (
        <PageSearchArea
          detailFields={fields}
          detailValues={values}
          onDetailValuesChange={setValues}
        />
      );
    }
    render(<ControlledSearch />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    expect(start).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '20261022' },
    });
    expect(start).toHaveAttribute('aria-invalid', 'true');
  });

  it('실제 적용된 상세 조건만 토글과 칩에 표시한다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ name: '입력 중', status: 'Y' }}
        appliedDetailValues={{
          name: '기존 검색어',
          createdAt: { from: '2026-10-01', to: '' },
          status: 'Y',
        }}
      />,
    );

    const toggle = screen.getByRole('button', { name: '상세 검색 열기' });
    expect(toggle).toBeVisible();
    expect(toggle).toHaveAttribute('aria-description', '적용된 상세 검색 조건 3개');
    expect(screen.queryByText('이름: 입력 중')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText('이름: 기존 검색어')).toBeVisible();
    expect(screen.getByText('생성일: 2026-10-01')).toBeVisible();
    expect(screen.getByText('상태: 사용')).toBeVisible();
  });

  it('미적용 입력만 있으면 상세검색 토글을 활성화하지 않는다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ name: '조회 전 값' }}
        appliedDetailValues={{}}
      />,
    );

    expect(
      screen.getByRole('button', { name: '상세 검색 열기' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /검색 조건 제거/ })).not.toBeInTheDocument();
  });

  it('적용된 상세 조건 칩 제거는 초안만 변경하고 명시적으로 조회하기 전까지 대기한다', () => {
    const onValuesChange = vi.fn();
    const onSearch = vi.fn();
    const appliedDetailValues = {
      name: '기존 검색어',
      status: 'Y',
    };
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 검색 조건 제거' }));

    const nextValues = { name: '', status: 'Y' };
    expect(onValuesChange).toHaveBeenLastCalledWith(nextValues);
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.queryByText('이름: 기존 검색어')).not.toBeInTheDocument();
    expect(screen.getByText('상태: 사용')).toBeVisible();
    expect(
      screen.getByText('조건 변경 내용은 조회 버튼을 눌러 적용하세요.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '이름 검색 조건 제거' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '상태 검색 조건 제거' }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '상태 검색 조건 제거' }));

    expect(onValuesChange).toHaveBeenLastCalledWith({ name: '', status: '' });
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({ name: '', status: '' });
  });

  it('조회 전 안내는 조건 칩 아래에 두고 작업 버튼은 맨 위 행에 유지한다', () => {
    const appliedDetailValues = { name: '기존 검색어', status: 'Y' };
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 검색 조건 제거' }));

    const notice = screen.getByRole('status');
    const actions = screen.getByRole('group', { name: '상세 검색 작업' });
    expect(notice.parentElement).toBe(actions.parentElement);
    expect(getComputedStyle(actions.parentElement as HTMLElement).display).toBe(
      'grid',
    );
    expect(getComputedStyle(actions).gridRow).toBe('1');
    expect(getComputedStyle(actions).flexWrap).toBe('nowrap');
  });

  it('필수 날짜 범위의 양 끝을 입력하기 전에는 조회하지 않는다', () => {
    const onSearch = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'orderDt',
            label: '수주일자',
            type: 'date',
            searchSpan: 1,
            required: true,
          },
        ]}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const from = screen.getByLabelText('수주일자 시작일');
    fireEvent.change(screen.getByLabelText('수주일자 종료일'), {
      target: { value: '20261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('필수 입력입니다.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();

    fireEvent.change(from, { target: { value: '20261001' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onSearch).toHaveBeenCalledWith({
      orderDt: { from: '2026-10-01', to: '2026-10-22' },
    });
  });

  it('필수 날짜 상세조건은 칩에서 해제할 수 없다', () => {
    const onValuesChange = vi.fn();
    const onSearch = vi.fn();
    const appliedDetailValues = {
      orderDt: { from: '2026-10-01', to: '2026-10-22' },
    };
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'orderDt',
            label: '수주일자',
            type: 'date',
            searchSpan: 1,
            required: true,
          },
        ]}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(
      screen.getByRole('button', { name: '수주일자 검색 조건 제거' }),
    ).toBeDisabled();
    expect(onValuesChange).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('상세검색이 열린 동안 그리드 로딩 덮개보다 위에 표시한다', () => {
    render(<PageSearchArea detailFields={fields} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    const detailDialog = screen.getByRole('dialog', { name: '상세 검색' });
    const searchArea = detailDialog.parentElement;
    expect(searchArea).not.toBeNull();
    const searchZIndex = Number.parseInt(
      getComputedStyle(searchArea as HTMLElement).zIndex,
      10,
    );
    expect(searchZIndex).toBeGreaterThan(12);
    expect(searchZIndex).toBeLessThan(1300);
  });

  const groupedFields: PageSearchField[] = [
    {
      field: 'submittedAt',
      label: '결재신청일',
      type: 'date',
      searchSpan: 4,
      group: 'date',
    },
    {
      field: 'documentStatus',
      label: '결재상태',
      type: 'select',
      searchSpan: 2,
      group: 'approval',
      options: [{ value: 'PENDING', label: '결재대기' }],
    },
    {
      field: 'documentType',
      label: '문서종류',
      type: 'select',
      searchSpan: 2,
      group: 'approval',
      options: [{ value: 'DRAFTING', label: '기안서' }],
    },
    {
      field: 'title',
      label: '제목',
      type: 'text',
      searchSpan: 4,
      group: 'title',
    },
    {
      field: 'drafter',
      label: '기안자',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'department',
      label: '기안부서',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'participant',
      label: '결재 참여자',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'standalone',
      label: '단독 필드',
      type: 'text',
      searchSpan: 3,
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
    expect(screen.queryByText('생성일', { exact: true })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

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

  it('group은 행을 나누고 span은 그룹 안의 필드 너비를 유지한다', () => {
    const { container } = render(
      <PageSearchArea detailFields={groupedFields}>
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    const groupRows = Array.from(
      container.querySelectorAll<HTMLElement>('[data-search-group]'),
    );
    expect(groupRows.map((group) => group.dataset.searchGroup)).toEqual([
      'date',
      'approval',
      'title',
      'participants',
    ]);
    expect(
      groupRows[1].querySelector('[data-search-field="documentStatus"]'),
    ).toHaveAttribute('data-search-span', '2');
    expect(
      groupRows[1].querySelector('[data-search-field="documentType"]'),
    ).toHaveAttribute('data-search-span', '2');
    expect(
      groupRows[2].querySelector('[data-search-field="title"]'),
    ).toHaveAttribute('data-search-span', '4');
    expect(within(groupRows[3]).getAllByRole('textbox')).toHaveLength(3);
    const standaloneField = container.querySelector(
      '[data-search-field="standalone"]',
    );
    expect(standaloneField).toHaveAttribute('data-search-span', '3');
    expect(standaloneField?.closest('[data-search-group]')).toBeNull();
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

  it('resolved 기본값을 초기화에 적용하고 선택적 초기화 callback을 호출한다', () => {
    const onDetailValuesChange = vi.fn();
    const onDetailReset = vi.fn();
    const onDetailSearch = vi.fn();
    const defaultValues = {
      createdAt: { from: '2026-09-20', to: '2026-10-20' },
    };

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        defaultValues={defaultValues}
        onDetailValuesChange={onDetailValuesChange}
        onDetailReset={onDetailReset}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-09-20');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('2026-10-20');

    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '변경 조건' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('');
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-09-20');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('2026-10-20');
    expect(onDetailValuesChange).toHaveBeenLastCalledWith(defaultValues);
    expect(onDetailReset).toHaveBeenCalledWith(defaultValues);
    expect(onDetailSearch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onDetailSearch).toHaveBeenCalledWith(defaultValues);
  });
});
