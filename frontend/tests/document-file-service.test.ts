import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: api.get, apiDelete: vi.fn(), apiDownload: vi.fn(), apiGetBlob: vi.fn(),
  apiPost: vi.fn(), apiPostFormData: vi.fn(), apiPut: vi.fn(),
  ApiResponseError: class extends Error {},
}));
import { listDocumentFiles } from '../src/pages/groupware/documents/write/services/documentApproval.service';

const fileItem = {
  fileId: 101, fileName: 'sample.pdf', fileSize: 1024, mimeType: 'application/pdf',
  uploadedByName: 'Sample User', createdAt: '2026-10-20T09:00:00Z',
  electronicApprovalId: 10, documentTitle: 'Sample Document', commentId: null,
};

describe('document file service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requests file pages with document filters and cursor', async () => {
    api.get.mockResolvedValue({ resultList: [fileItem], hasNext: false, nextBeforeFileId: null });
    const result = await listDocumentFiles({
      scope: 'ALL', documentType: 'DRAFTING', electronicApprovalId: 10, beforeFileId: 150,
    });
    expect(result.resultList).toEqual([fileItem]);
    const url = api.get.mock.calls[0][0];
    expect(url).toContain('/approvals/files?');
    const params = new URL(url, 'http://localhost').searchParams;
    expect(Object.fromEntries(params)).toEqual({
      scope: 'ALL', documentType: 'DRAFTING', electronicApprovalId: '10', beforeFileId: '150',
    });
  });
  it.each([
    {},
    { resultList: [], hasNext: true, nextBeforeFileId: 1 },
    { resultList: [fileItem], hasNext: false, nextBeforeFileId: 101 },
    { resultList: [{ ...fileItem, fileId: -1 }], hasNext: false, nextBeforeFileId: null },
    { resultList: [{ ...fileItem, createdAt: 'invalid' }], hasNext: false, nextBeforeFileId: null },
  ])('rejects malformed file pages instead of treating them as empty: %j', async (response) => {
    api.get.mockResolvedValue(response);
    await expect(listDocumentFiles({ scope: 'ALL' })).rejects.toThrow('파일 목록 응답');
  });
});
