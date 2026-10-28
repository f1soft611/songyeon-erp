import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
}));

vi.mock(
  '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed',
  () => ({
    DocumentApprovalDetailFeed: vi.fn(() => null),
  }),
);
vi.mock(
  '../src/pages/groupware/documents/write/components/DocumentComposerDialog',
  () => ({
    DocumentComposerDialog: vi.fn(() => null),
  }),
);

import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';
import { DocumentApprovalDetailFeed } from '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import { createDocumentStatusColumns } from '../src/pages/groupware/documents/status/components/DocumentStatusGrid';
import type { DocumentApprovalDetail } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import type { DocumentStatusRow } from '../src/pages/groupware/documents/status/types/documentStatus.types';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';

const row: DocumentStatusRow = {
  electronicApprovalId: 41,
  title: 'Annual plan',
  documentType: 'DRAFTING',
  documentStatus: 'COMPLETED',
  submittedAt: '2026-10-10T09:00:00',
  drafterName: 'Morgan',
  drafterDepartmentName: 'Finance',
  participantName: 'Sam',
  myParticipantType: 'APPROVAL',
  myActionStatus: 'PENDING',
  currentApprovalStep: '1단계 · Sam',
  approvalProgress: '2/2',
  updatedAt: '2026-10-11T10:00:00',
};

const detail: DocumentApprovalDetail = {
  ...row,
  viewCount: 1,
  isDrafter: false,
  draftingWorkCategoryId: null,
  contentsJson: '{}',
  contentsHtml: '<p>Approval body</p>',
  approvalLines: [
    {
      electronicApprovalLineId: 501,
      stageOrder: 1,
      participantOrder: 1,
      participantType: 'APPROVAL',
      participantUserId: '102',
      participantName: 'Sam',
      actionStatus: 'APPROVED',
    },
  ],
  attachments: [],
  systemEvents: [],
};

const selectedModule = {
  id: 'groupware',
  name: '그룹웨어',
  icon: null,
  tree: [],
  menus: [],
};

const SYSTEM_TODAY = '2026-10-20';
const SYSTEM_DATE_RANGE = { from: '2026-09-20', to: SYSTEM_TODAY };

function renderDocumentStatusPage(currentPageKey = 'documents', read?: boolean) {
  return render(
    <DashboardContent
      selectedModule={selectedModule}
      currentMenuName="문서현황"
      currentPageKey={currentPageKey}
      breadcrumbItems={['그룹웨어', '문서현황']}
      selectedMenuPermissions={
        read === undefined
          ? undefined
          : { read, create: false, update: false, delete: false }
      }
      content={{
        title: '문서현황',
        description: '전자결재 문서를 검색하고 확인합니다.',
        cards: [],
        items: [],
      }}
    />,
  );
}

function getListRequest(): URLSearchParams {
  const calls = api.get.mock.calls.filter(([path]) =>
    String(path).includes('/api/v1/groupware/approvals/documents/search?'),
  );
  const call = calls[calls.length - 1];
  if (!call) throw new Error('문서현황 목록 요청을 찾을 수 없습니다.');
  return new URL(String(call[0]), 'http://localhost').searchParams;
}

function getListRequests(): number {
  return api.get.mock.calls.filter(([path]) =>
    String(path).includes('/api/v1/groupware/approvals/documents/search?'),
  ).length;
}

describe('document status page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    api.get.mockImplementation((path: string) => {
      if (path.includes('/common/system-date')) {
        return Promise.resolve({ today: SYSTEM_TODAY });
      }
      return path.includes('/documents/search?')
        ? Promise.resolve({ resultList: [row], totalRowCount: 1 })
        : Promise.resolve({});
    });
  });

  it('shows the header read action only with menu read permission', async () => {
    const view = renderDocumentStatusPage('documents', true);
    expect(screen.getByRole('button', { name: '조회' })).toBeInTheDocument();
    await waitFor(() => expect(getListRequests()).toBe(1));
    view.unmount();

    const denied = renderDocumentStatusPage('documents', false);
    expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
    await waitFor(() => expect(getListRequests()).toBe(2));
    denied.unmount();

    renderDocumentStatusPage();
    expect(screen.queryByRole('button', { name: '조회' })).not.toBeInTheDocument();
    await waitFor(() => expect(getListRequests()).toBe(3));
  });

  it('disables the header read action until search defaults are ready', async () => {
    let resolveDate!: (value: { today: string }) => void;
    const pendingDate = new Promise<{ today: string }>((resolve) => {
      resolveDate = resolve;
    });
    api.get.mockImplementation((path: string) =>
      path.includes('/common/system-date')
        ? pendingDate
        : Promise.resolve({ resultList: [row], totalRowCount: 1 }),
    );

    renderDocumentStatusPage('documents', true);
    const button = screen.getByRole('button', { name: '조회' });
    expect(button).toBeDisabled();
    expect(getListRequests()).toBe(0);
    await act(async () => resolveDate({ today: SYSTEM_TODAY }));
    await waitFor(() => expect(button).toBeEnabled());
    await waitFor(() => expect(getListRequests()).toBe(1));
  });

  it('applies current search input and repeats the same query from the header', async () => {
    renderDocumentStatusPage('documents', true);
    await waitFor(() => expect(getListRequests()).toBe(1));
    fireEvent.change(
      screen.getByRole('textbox', { name: '문서현황 빠른 검색' }),
      { target: { value: 'Updated plan' } },
    );
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(getListRequests()).toBe(2));
    expect(getListRequest().get('keyword')).toBe('Updated plan');
    expect(window.sessionStorage.getItem('s-erp:page:document-status'))
      .toContain('Updated plan');

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(getListRequests()).toBe(3));
    expect(getListRequest().get('keyword')).toBe('Updated plan');
  });

  it('declares the submitted date default using server date metadata', () => {
    const field = toPageSearchFields(createDocumentStatusColumns()).find(
      (searchField) => searchField.field === 'submittedAt',
    );

    expect(field?.defaultValue).toEqual({
      from: { type: 'systemDate', offset: { months: -1 } },
      to: { type: 'systemDate' },
    });
  });

  it('derives detailed search fields from the F1-Grid column metadata', () => {
    const columns = createDocumentStatusColumns();
    const fields = toPageSearchFields(columns);

    expect(columns.map((column) => String(column.field))).toEqual([
      'rowNumber',
      'electronicApprovalId',
      'title',
      'documentType',
      'documentStatus',
      'submittedAt',
      'drafterName',
      'drafterDepartmentName',
      'participantName',
      'myParticipantType',
      'myActionStatus',
      'currentApprovalStep',
      'approvalProgress',
      'updatedAt',
    ]);
    expect(fields.map((field) => field.field)).toEqual([
      'submittedAt',
      'documentStatus',
      'documentType',
      'electronicApprovalId',
      'title',
      'drafterName',
      'drafterDepartmentName',
      'participantName',
      'myParticipantType',
      'myActionStatus',
      'currentApprovalStep',
    ]);
    expect(fields.find((field) => field.field === 'submittedAt')?.type).toBe(
      'date',
    );
    expect(fields.find((field) => field.field === 'submittedAt')?.defaultValue)
      .toEqual({
        from: { type: 'systemDate', offset: { months: -1 } },
        to: { type: 'systemDate' },
      });
    expect(fields.find((field) => field.field === 'electronicApprovalId')?.type)
      .toBe('text');
    expect(fields.find((field) => field.field === 'myParticipantType')?.type)
      .toBe('select');
    expect(
      columns.find((column) => column.field === 'myParticipantType')?.options,
    ).toContainEqual({ value: 'DRAFTER', label: '기안' });
    expect(fields.find((field) => field.field === 'myActionStatus')?.type)
      .toBe('select');
    expect(columns.find((column) => column.field === 'electronicApprovalId')?.headerName)
      .toBe('문서번호');
    expect(columns.some((column) => column.field === 'eabusNo')).toBe(false);
    expect(
      columns.find((column) => column.field === 'participantName')?.hidden,
    ).toBe(true);
    expect(
      fields.find((field) => field.field === 'participantName')?.label,
    ).toBe('결재 참여자');
    expect(
      fields.map((field) => [field.field, field.searchSpan]),
    ).toEqual([
      ['submittedAt', 4],
      ['documentStatus', 2],
      ['documentType', 2],
      ['electronicApprovalId', 1],
      ['title', 4],
      ['drafterName', 1],
      ['drafterDepartmentName', 1],
      ['participantName', 1],
      ['myParticipantType', 1],
      ['myActionStatus', 1],
      ['currentApprovalStep', 4],
    ]);
  });

  it('provides document status content for the read route alias', () => {
    expect(pageContentMap.read.description).toBe(
      '과거 전자결재 문서를 검색하고 권한에 따라 상세 및 후속 업무를 처리합니다.',
    );
  });

  it('renders the status page for the /groupware/doc/read menu key', async () => {
    renderDocumentStatusPage('read');

    expect(
      await screen.findByRole('grid', { name: '문서현황' }),
    ).toBeInTheDocument();
  });

  it('waits for the server date before sending the initial list request', async () => {
    let resolveSystemDate: (value: { today: string }) => void = () => {};
    const systemDateResponse = new Promise<{ today: string }>((resolve) => {
      resolveSystemDate = resolve;
    });
    api.get.mockImplementation((path: string) => {
      if (path.includes('/common/system-date')) return systemDateResponse;
      return path.includes('/documents/search?')
        ? Promise.resolve({ resultList: [row], totalRowCount: 1 })
        : Promise.resolve({});
    });

    renderDocumentStatusPage();

    expect(getListRequests()).toBe(0);
    await act(async () => resolveSystemDate({ today: SYSTEM_TODAY }));
    expect(await screen.findByText('41')).toBeInTheDocument();
    const request = getListRequest();
    expect(request.get('scope')).toBe('ALL');
    expect(request.has('offset')).toBe(false);
    expect(request.has('limit')).toBe(false);
    expect(request.get('submittedAtFrom')).toBe(SYSTEM_DATE_RANGE.from);
    expect(request.get('submittedAtTo')).toBe(SYSTEM_DATE_RANGE.to);

  });

  it('shows a retryable system date error without sending a defaultless list request', async () => {
    let dateRequests = 0;
    api.get.mockImplementation((path: string) => {
      if (path.includes('/common/system-date')) {
        dateRequests += 1;
        return dateRequests === 1
          ? Promise.reject(new Error('system date unavailable'))
          : Promise.resolve({ today: SYSTEM_TODAY });
      }
      return path.includes('/documents/search?')
        ? Promise.resolve({ resultList: [row], totalRowCount: 1 })
        : Promise.resolve({});
    });

    renderDocumentStatusPage();

    expect(await screen.findByText('system date unavailable')).toBeVisible();
    expect(getListRequests()).toBe(0);
    expect(
      window.sessionStorage.getItem('s-erp:page:document-status'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '문서현황 다시 조회' }));

    expect(await screen.findByText('41')).toBeInTheDocument();
    expect(getListRequest().get('submittedAtFrom')).toBe(SYSTEM_DATE_RANGE.from);
    expect(getListRequest().get('submittedAtTo')).toBe(SYSTEM_DATE_RANGE.to);
    expect(dateRequests).toBe(2);
  });

  it('restores the last applied quick and detailed search when returning to the page', async () => {
    window.sessionStorage.setItem(
      's-erp:page:document-status',
      JSON.stringify({
        version: 1,
        value: {
          keyword: 'budget',
          detailValues: {
            title: 'Quarterly',
            submittedAt: { from: '2026-10-01', to: '2026-10-20' },
          },
        },
      }),
    );
    renderDocumentStatusPage();

    expect(await screen.findByText('41')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
      .toHaveValue('budget');
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByRole('textbox', { name: '제목' }))
      .toHaveValue('Quarterly');

    const request = getListRequest();
    expect(request.get('keyword')).toBe('budget');
    expect(request.get('title')).toBe('Quarterly');
    expect(request.get('submittedAtFrom')).toBe('2026-10-01');
    expect(request.get('submittedAtTo')).toBe('2026-10-20');
  });

  it('keeps an omitted date empty when restoring an applied session', async () => {
    window.sessionStorage.setItem(
      's-erp:page:document-status',
      JSON.stringify({
        version: 1,
        value: {
          keyword: 'budget',
          detailValues: { title: 'Quarterly' },
        },
      }),
    );

    renderDocumentStatusPage();

    expect(await screen.findByText('41')).toBeInTheDocument();
    expect(getListRequest().get('keyword')).toBe('budget');
    expect(getListRequest().get('title')).toBe('Quarterly');
    expect(getListRequest().has('submittedAtFrom')).toBe(false);
    expect(getListRequest().has('submittedAtTo')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByLabelText('결재신청일 시작일')).toHaveValue('');
    expect(screen.getByLabelText('결재신청일 종료일')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => {
      expect(getListRequest().has('submittedAtFrom')).toBe(false);
      expect(getListRequest().has('submittedAtTo')).toBe(false);
    });
  });

  it('keeps the last applied search when later inputs are not submitted', async () => {
    const firstRender = renderDocumentStatusPage();
    expect(await screen.findByText('41')).toBeInTheDocument();
    const searchInput = screen.getByRole('textbox', {
      name: '문서현황 빠른 검색',
    });
    fireEvent.change(searchInput, { target: { value: 'applied' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(getListRequest().get('keyword')).toBe('applied');
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: '문서현황 빠른 검색' }),
      { target: { value: 'unapplied' } },
    );
    firstRender.unmount();

    api.get.mockClear();
    renderDocumentStatusPage();
    expect(await screen.findByText('41')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
      .toHaveValue('applied');
    expect(getListRequest().get('keyword')).toBe('applied');
  });

  it('restores the default submitted date after resetting conditions', async () => {
    window.sessionStorage.setItem(
      's-erp:page:document-status',
      JSON.stringify({
        version: 1,
        value: { keyword: 'old', detailValues: { title: 'Old title' } },
      }),
    );
    api.get.mockImplementation((path: string) =>
      path.includes('/common/system-date')
        ? Promise.resolve({ today: SYSTEM_TODAY })
        : Promise.resolve({ resultList: [], totalRowCount: 0 }),
    );
    const firstRender = renderDocumentStatusPage();
    expect(await screen.findByText(/조회 결과가 없습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '검색 조건 초기화' }));

    await waitFor(() => {
      expect(getListRequest().get('submittedAtFrom')).toBe(SYSTEM_DATE_RANGE.from);
      expect(getListRequest().get('submittedAtTo')).toBe(SYSTEM_DATE_RANGE.to);
    });
    expect(getListRequest().has('title')).toBe(false);
    expect(getListRequest().has('keyword')).toBe(false);
    await waitFor(() => {
      expect(JSON.parse(
        window.sessionStorage.getItem('s-erp:page:document-status') ?? '{}',
      )).toEqual({
        version: 1,
        value: {
          keyword: '',
          detailValues: { submittedAt: SYSTEM_DATE_RANGE },
        },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByLabelText('결재신청일 시작일'))
      .toHaveValue(SYSTEM_DATE_RANGE.from);
    expect(screen.getByLabelText('결재신청일 종료일'))
      .toHaveValue(SYSTEM_DATE_RANGE.to);
    firstRender.unmount();

    api.get.mockClear();
    renderDocumentStatusPage();
    expect(await screen.findByText(/조회 결과가 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
      .toHaveValue('');
    expect(getListRequest().get('submittedAtFrom')).toBe(SYSTEM_DATE_RANGE.from);
    expect(getListRequest().get('submittedAtTo')).toBe(SYSTEM_DATE_RANGE.to);
    expect(getListRequest().has('title')).toBe(false);
    expect(getListRequest().has('keyword')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByLabelText('결재신청일 시작일'))
      .toHaveValue(SYSTEM_DATE_RANGE.from);
    expect(screen.getByLabelText('결재신청일 종료일'))
      .toHaveValue(SYSTEM_DATE_RANGE.to);
  });

  it('opens only the read-only context menu on right-click and still opens detail on left-click', async () => {
    renderDocumentStatusPage();
    const cell = await screen.findByRole('gridcell', { name: row.title });

    fireEvent.mouseDown(cell, { button: 2 });
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    fireEvent.contextMenu(cell, { button: 2 });
    fireEvent.mouseUp(cell, { button: 2 });

    const menu = await screen.findByRole('menu');
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    for (const name of [
      '엑셀 내보내기',
      '컬럼 길이 자동 조정',
      '정렬 해제',
      '설정을 기본값으로 복원',
    ]) {
      expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument();
    }
    expect(within(menu).getByRole('menuitem', { name: '엑셀 내보내기' }))
      .not.toHaveAttribute('aria-disabled', 'true');
    for (const name of [
      '행 추가',
      '위에 행 삽입',
      '아래에 행 삽입',
      '행 복사',
      '행 삭제',
    ]) {
      expect(within(menu).queryByRole('menuitem', { name }))
        .not.toBeInTheDocument();
    }
    expect(within(menu).getByRole('menuitem', { name: '필터 해제' }))
      .toHaveAttribute('aria-disabled', 'true');

    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    fireEvent.click(cell);
    expect(await screen.findByTestId('page-area-overlay')).toBeInTheDocument();
  });

  it('opens the existing approval detail overlay for the selected document and closes it', async () => {
    renderDocumentStatusPage();
    await screen.findByText('41');

    const selectedRow = screen.getByRole('row', { name: /41 행 선택/ });
    fireEvent.click(within(selectedRow).getByRole('checkbox'));

    expect(await screen.findByTestId('page-area-overlay')).toBeInTheDocument();
    const feedCall = vi.mocked(DocumentApprovalDetailFeed).mock.calls.at(-1);
    expect(feedCall?.[0].electronicApprovalId).toBe(41);

    fireEvent.click(screen.getByTestId('page-area-overlay-backdrop'));
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  });

  it('forwards detail actions to the existing composer and refreshes the list', async () => {
    renderDocumentStatusPage();
    await screen.findByText('41');
    const selectedRow = screen.getByRole('row', { name: /41 행 선택/ });
    fireEvent.click(within(selectedRow).getByRole('checkbox'));
    await screen.findByTestId('page-area-overlay');

    const initialFeedCall = vi.mocked(DocumentApprovalDetailFeed).mock.calls.at(-1);
    expect(initialFeedCall).toBeDefined();
    if (!initialFeedCall) throw new Error('Detail panel props were not captured.');

    act(() => initialFeedCall[0].onEditDocument(detail));
    await waitFor(() => {
      const composerProps = vi.mocked(DocumentComposerDialog).mock.calls.at(-1)?.[0];
      expect(composerProps?.open).toBe(true);
      expect(composerProps?.initialDocument).toEqual(detail);
    });

    const previousListRequests = getListRequests();
    act(() => initialFeedCall[0].onActionComplete());
    await waitFor(() =>
      expect(getListRequests()).toBeGreaterThan(previousListRequests),
    );
  });

  it('loads all matching status rows without paging parameters', async () => {
    const allRows = Array.from({ length: 205 }, (_, index) => ({
      ...row,
      electronicApprovalId: index + 1,
      title: `Document ${index + 1}`,
    }));
    api.get.mockImplementation((path: string) =>
      path.includes('/common/system-date')
        ? Promise.resolve({ today: SYSTEM_TODAY })
        : path.includes('/documents/search?')
          ? Promise.resolve({ resultList: allRows, totalRowCount: 205 })
          : Promise.resolve({}),
    );

    renderDocumentStatusPage();
    const grid = await screen.findByRole('grid', { name: '문서현황' });
    await waitFor(() => expect(grid).toHaveAttribute('aria-rowcount', '205'));

    expect(getListRequest().has('offset')).toBe(false);
    expect(getListRequest().has('limit')).toBe(false);
  });

  it('clears the editing document and refreshes the list when the composer closes', async () => {
    renderDocumentStatusPage();
    const cell = await screen.findByRole('gridcell', { name: row.title });
    fireEvent.click(cell);
    await screen.findByTestId('page-area-overlay');
    const feedProps = vi.mocked(DocumentApprovalDetailFeed).mock.calls.at(-1)?.[0];
    if (!feedProps) throw new Error('Detail panel props were not captured.');
    act(() => feedProps.onEditDocument(detail));
    const composerProps = vi.mocked(DocumentComposerDialog).mock.calls.at(-1)?.[0];
    if (!composerProps) throw new Error('Composer props were not captured.');
    expect(composerProps.open).toBe(true);
    const previousRequests = getListRequests();

    act(() => composerProps.onClose());

    await waitFor(() => expect(getListRequests()).toBe(previousRequests + 1));
    const closedComposer = vi.mocked(DocumentComposerDialog).mock.calls.at(-1)?.[0];
    expect(closedComposer?.open).toBe(false);
    expect(closedComposer?.initialDocument).toBeNull();
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  });

  it('sorts and filters loaded status rows without reloading them', async () => {
    const otherRow = {
      ...row,
      electronicApprovalId: 42,
      title: 'Other document',
    };
    api.get.mockImplementation((path: string) =>
      path.includes('/common/system-date')
        ? Promise.resolve({ today: SYSTEM_TODAY })
        : path.includes('/documents/search?')
          ? Promise.resolve({
              resultList: [row, otherRow],
              totalRowCount: 2,
            })
          : Promise.resolve({}),
    );

    renderDocumentStatusPage();
    const grid = await screen.findByRole('grid', { name: '문서현황' });
    await waitFor(() => expect(grid).toHaveAttribute('aria-rowcount', '2'));
    const initialRequests = getListRequests();

    fireEvent.click(
      screen.getByRole('button', { name: '문서번호 컬럼 메뉴' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));
    expect(getListRequests()).toBe(initialRequests);

    fireEvent.click(screen.getByRole('button', { name: '제목 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('제목 필터 값'), {
      target: { value: 'Annual' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    await waitFor(() => expect(grid).toHaveAttribute('aria-rowcount', '1'));
    expect(getListRequests()).toBe(initialRequests);
  });

  it('applies the detailed title filter to the next remote query', async () => {
    renderDocumentStatusPage();
    await screen.findByText('41');

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: 'Budget' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      expect(getListRequest().get('title')).toBe('Budget');
    });
  });

  it('applies document ID and personal approval filters from detailed search', async () => {
    renderDocumentStatusPage();
    await screen.findByText('41');

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '문서번호' }), {
      target: { value: '41' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '내 결재 역할' }));
    fireEvent.click(await screen.findByRole('option', { name: '결재' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '내 처리상태' }));
    fireEvent.click(await screen.findByRole('option', { name: '처리 중' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: '현재 결재담당자' }),
      { target: { value: 'Sam' } },
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: '결재 참여자' }),
      { target: { value: 'Sam' } },
    );
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      const request = getListRequest();
      expect(request.get('electronicApprovalId')).toBe('41');
      expect(request.get('myParticipantType')).toBe('APPROVAL');
      expect(request.get('myActionStatus')).toBe('PENDING');
      expect(request.get('currentApproverName')).toBe('Sam');
      expect(request.get('participantName')).toBe('Sam');
    });
  }, 20000);

  it('shows an explicit empty state when no historical documents match', async () => {
    api.get.mockImplementation((path: string) =>
      path.includes('/common/system-date')
        ? Promise.resolve({ today: SYSTEM_TODAY })
        : Promise.resolve({ resultList: [], totalRowCount: 0 }),
    );
    renderDocumentStatusPage();

    expect(
      await screen.findByText(/조회 결과가 없습니다.*기간을 넓히거나/),
    ).toBeInTheDocument();
  });
});
