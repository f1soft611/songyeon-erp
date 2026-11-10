import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { F1GridDataSourceQuery } from '../src/shared/components/f1-grid/types/grid.types';

const api = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get,
}));

import {
  createDocumentStatusDataSource,
  searchDocumentStatus,
} from '../src/pages/groupware/documents/status/services/documentStatus.service';
import type { DocumentStatusRow } from '../src/pages/groupware/documents/status/types/documentStatus.types';

const row: DocumentStatusRow = {
  electronicApprovalId: 41,
  documentNo: 'EA-20261010-0001',
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

function query(
  signal: AbortSignal,
): F1GridDataSourceQuery<DocumentStatusRow> {
  return {
    offset: 20,
    limit: 40,
    sorts: [{ field: 'submittedAt', direction: 'desc' }],
    filters: [],
    signal,
  };
}

describe('document status service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes status filters and remote paging into the dedicated search API', async () => {
    api.get.mockResolvedValue({ resultList: [row], totalRowCount: 201 });
    const controller = new AbortController();
    const dataSource = createDocumentStatusDataSource({
      keyword: 'annual plan',
      documentNo: 'EA-20261010-0001',
      title: 'Annual',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      submittedAtFrom: '2026-09-16',
      submittedAtTo: '2026-10-16',
      drafterName: 'Morgan',
      drafterDepartmentName: 'Finance',
      participantName: 'Sam',
      myParticipantType: 'APPROVAL',
      myActionStatus: 'PENDING',
      currentApproverName: 'Sam',
      updatedAtFrom: '2026-10-01',
      updatedAtTo: '2026-10-16',
    });

    await expect(dataSource.load(query(controller.signal))).resolves.toEqual({
      rows: [row],
      totalRowCount: 201,
    });

    const [path, signal] = api.get.mock.calls[0] as [string, AbortSignal];
    const request = new URL(path, 'http://localhost');
    expect(request.pathname).toBe('/api/v1/groupware/approvals/documents/search');
    expect(Object.fromEntries(request.searchParams)).toEqual({
      scope: 'ALL',
      offset: '20',
      limit: '40',
      keyword: 'annual plan',
      documentNo: 'EA-20261010-0001',
      title: 'Annual',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      submittedAtFrom: '2026-09-16',
      submittedAtTo: '2026-10-16',
      drafterName: 'Morgan',
      drafterDepartmentName: 'Finance',
      participantName: 'Sam',
      myParticipantType: 'APPROVAL',
      myActionStatus: 'PENDING',
      currentApproverName: 'Sam',
      updatedAtFrom: '2026-10-01',
      updatedAtTo: '2026-10-16',
      sortField: 'submittedAt',
      sortDirection: 'DESC',
    });
    expect(signal).toBe(controller.signal);
  });

  it('sorts document numbers by the persisted document number', async () => {
    api.get.mockResolvedValue({ resultList: [row], totalRowCount: 1 });
    const dataSource = createDocumentStatusDataSource({});
    const request = query(new AbortController().signal);
    request.sorts = [{ field: 'documentNo', direction: 'asc' }];

    await dataSource.load(request);

    const [path] = api.get.mock.calls[0] as [string];
    const params = new URL(path, 'http://localhost').searchParams;
    expect(params.get('sortField')).toBe('documentNo');
    expect(params.get('sortDirection')).toBe('ASC');
  });

  it('loads all matching status rows without paging parameters', async () => {
    api.get.mockResolvedValue({ resultList: [row], totalRowCount: 1 });
    const controller = new AbortController();

    await expect(
      searchDocumentStatus(
        { documentStatus: 'COMPLETED', submittedAtFrom: '2026-09-20' },
        controller.signal,
      ),
    ).resolves.toEqual({ rows: [row], totalRowCount: 1 });

    const [path, signal] = api.get.mock.calls[0] as [string, AbortSignal];
    const request = new URL(path, 'http://localhost');
    expect(request.searchParams.get('documentStatus')).toBe('COMPLETED');
    expect(request.searchParams.get('submittedAtFrom')).toBe('2026-09-20');
    expect(request.searchParams.has('offset')).toBe(false);
    expect(request.searchParams.has('limit')).toBe(false);
    expect(request.searchParams.has('sortField')).toBe(false);
    expect(request.searchParams.has('sortDirection')).toBe(false);
    expect(signal).toBe(controller.signal);
  });

  it.each(['MY_PENDING', 'DRAFT', 'REVISION_REQUESTED'] as const)(
    'sends dashboard scope %s to the existing search API',
    async (scope) => {
      api.get.mockResolvedValue({ resultList: [row], totalRowCount: 1 });

      await searchDocumentStatus({ scope });

      const [path] = api.get.mock.calls[0] as [string];
      expect(new URL(path, 'http://localhost').searchParams.get('scope')).toBe(scope);
    },
  );

  it('accepts the drafter role returned for the current user', async () => {
    api.get.mockResolvedValue({
      resultList: [{ ...row, myParticipantType: 'DRAFTER' }],
      totalRowCount: 1,
    });
    const dataSource = createDocumentStatusDataSource({});

    await expect(dataSource.load(query(new AbortController().signal))).resolves
      .toMatchObject({
        rows: [{ myParticipantType: 'DRAFTER' }],
        totalRowCount: 1,
      });
  });

  it.each([
    { myParticipantType: 'REFERENCE', myActionStatus: 'CONFIRMED' },
    { myParticipantType: 'APPROVAL, REFERENCE', myActionStatus: 'APPROVED, CONFIRMED' },
  ])('keeps the full list when a confirmed reference is present: %j', async (reference) => {
    const confirmedRow = { ...row, electronicApprovalId: 42, ...reference };
    const rows = [row, confirmedRow];
    api.get.mockResolvedValue({ resultList: rows, totalRowCount: 2 });

    await expect(searchDocumentStatus({})).resolves.toEqual({
      rows, totalRowCount: 2,
    });
    await expect(
      createDocumentStatusDataSource({}).load(query(new AbortController().signal)),
    ).resolves.toEqual({ rows, totalRowCount: 2 });
  });

  it('rejects malformed page responses instead of returning success-shaped empty rows', async () => {
    const dataSource = createDocumentStatusDataSource({});
    const request = query(new AbortController().signal);
    api.get.mockResolvedValueOnce({ totalRowCount: 2 });
    await expect(dataSource.load(request)).rejects.toThrow(
      '전자결재 문서 검색 응답을 확인할 수 없습니다.',
    );

    api.get.mockResolvedValueOnce({ resultList: [row], totalRowCount: -1 });
    await expect(dataSource.load(request)).rejects.toThrow(
      '전자결재 문서 검색 응답을 확인할 수 없습니다.',
    );
  });

  it('propagates API failures to the grid error surface', async () => {
    const dataSource = createDocumentStatusDataSource({});
    const failure = new Error('network failed');
    api.get.mockRejectedValue(failure);

    await expect(
      dataSource.load(query(new AbortController().signal)),
    ).rejects.toBe(failure);
  });

  it('normalizes numeric dates in both full and paged results', async () => {
    const timestamp = Date.UTC(2026, 9, 20);
    api.get.mockResolvedValue({
      resultList: [{ ...row, submittedAt: timestamp, updatedAt: null }],
      totalRowCount: 1,
    });
    const expected = {
      rows: [{ ...row, submittedAt: '2026-10-20T00:00:00.000Z', updatedAt: null }],
      totalRowCount: 1,
    };
    await expect(searchDocumentStatus({})).resolves.toEqual(expected);
    await expect(
      createDocumentStatusDataSource({}).load(query(new AbortController().signal)),
    ).resolves.toEqual(expected);
  });

  it.each([
    { documentType: 'INVALID' },
    { documentStatus: 'INVALID' },
    { myParticipantType: 'DRAFTER, INVALID' },
    { myActionStatus: 'APPROVED, INVALID' },
    { submittedAt: Number.NaN },
    { electronicApprovalId: 1.5 },
    { documentNo: '' },
    { documentNo: '41' },
  ])('rejects malformed rows through both service entry points: %j', async (invalid) => {
    api.get.mockResolvedValue({
      resultList: [{ ...row, ...invalid }],
      totalRowCount: 1,
    });
    await expect(searchDocumentStatus({})).rejects.toThrow(
      '전자결재 문서 검색 응답을 확인할 수 없습니다.',
    );
    await expect(
      createDocumentStatusDataSource({}).load(query(new AbortController().signal)),
    ).rejects.toThrow('전자결재 문서 검색 응답을 확인할 수 없습니다.');
  });
});
