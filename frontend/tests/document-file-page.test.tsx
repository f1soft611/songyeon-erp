import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  listDocumentApprovals: vi.fn(), listPinnedDocumentApprovals: vi.fn(), getDocumentApprovalSummary: vi.fn(), listDocumentFiles: vi.fn(),
  pinDocumentApproval: vi.fn(), unpinDocumentApproval: vi.fn(),
  downloadDocumentApprovalAttachment: vi.fn(), downloadApprovalCommentAttachment: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => api);
vi.mock('../src/shared/context/NotificationContext', () => ({ useNotification: () => ({ showError: api.showError }) }));
vi.mock('../src/pages/groupware/documents/write/components/DocumentComposerDialog', () => ({
  DocumentComposerDialog: () => null,
}));
vi.mock('../src/pages/groupware/documents/write/components/DocumentFeedItem', () => ({
  DocumentFeedItem: () => null,
}));
vi.mock('../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed', () => ({
  DocumentApprovalDetailFeed: ({
    electronicApprovalId,
    isPinned,
    onTogglePin,
  }: {
    electronicApprovalId: number;
    isPinned: boolean;
    onTogglePin: (id: number, isPinned: boolean, title: string) => void;
  }) => (
    <>
      <div>상세 {electronicApprovalId}</div>
      <button
        type="button"
        aria-label={`${isPinned ? '상단 고정 해제' : '상단 고정'} Sample Document`}
        onClick={() => onTogglePin(electronicApprovalId, isPinned, 'Sample Document')}
      >
        고정 상태 액션
      </button>
    </>
  ),
}));
import { DocumentWritePage } from '../src/pages/groupware/documents/write/DocumentWritePage';

const props = {
  selectedModule: { id: 'groupware', name: '그룹웨어', icon: <span>G</span>, tree: [], menus: [], path: '/groupware' },
  currentMenuName: '문서작성',
  content: { title: '문서작성', description: '문서작성', cards: [], items: [] },
};
const directFile = {
  fileId: 100, fileName: 'direct.pdf', fileSize: 1024, mimeType: 'application/pdf',
  uploadedByName: 'Sample User', createdAt: '2026-10-20T09:00:00Z',
  electronicApprovalId: 10, documentTitle: 'Sample Document', commentId: null,
};
const commentFile = { ...directFile, fileId: 99, fileName: 'comment.xlsx', commentId: 5 };

describe('document write file mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listDocumentApprovals.mockResolvedValue({ resultList: [], totalRowCount: 0 });
    api.listPinnedDocumentApprovals.mockResolvedValue([]);
    api.pinDocumentApproval.mockResolvedValue(undefined);
    api.unpinDocumentApproval.mockResolvedValue(undefined);
    api.downloadDocumentApprovalAttachment.mockResolvedValue(undefined);
    api.downloadApprovalCommentAttachment.mockResolvedValue(undefined);
    api.getDocumentApprovalSummary.mockResolvedValue({
      actionRequiredCount: 0, inProgressCount: 0, draftCount: 0, completedCount: 0,
      revisionRequestedCount: 0, rejectedCount: 0, notices: [],
    });
    api.listDocumentFiles.mockResolvedValue({
      resultList: [directFile, commentFile], hasNext: false, nextBeforeFileId: null,
    });
  });

  it('uses file queries instead of document queries and reuses source-specific downloads', async () => {
    render(<DocumentWritePage {...props} />);
    await waitFor(() => expect(api.listDocumentApprovals).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '파일형 보기' }));
    fireEvent.click(await screen.findByRole('button', { name: 'direct.pdf 다운로드' }));
    await waitFor(() => expect(api.downloadDocumentApprovalAttachment).toHaveBeenCalledWith(10, 100, 'direct.pdf'));
    fireEvent.click(screen.getByRole('button', { name: 'comment.xlsx 다운로드' }));
    await waitFor(() => expect(api.downloadApprovalCommentAttachment).toHaveBeenCalledWith(10, 5, 99, 'comment.xlsx'));
    expect(api.listDocumentApprovals).toHaveBeenCalledOnce();
    expect(screen.queryByText(/상단고정/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'comment.xlsx 원문 보기' }));
    expect(await screen.findByText('상세 10')).toBeInTheDocument();
  });

  it('retains file mode when applying summary filters and reports download errors', async () => {
    api.downloadDocumentApprovalAttachment.mockRejectedValueOnce(new Error('다운로드 실패'));
    render(<DocumentWritePage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '파일형 보기' }));
    fireEvent.click(await screen.findByRole('button', { name: 'direct.pdf 다운로드' }));
    await waitFor(() => expect(api.showError).toHaveBeenCalledWith('다운로드 실패'));
    fireEvent.click(screen.getByRole('button', { name: /작성 중 문서/ }));
    await waitFor(() => expect(api.listDocumentFiles).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'DRAFT', beforeFileId: undefined }),
    ));
    expect(screen.getByRole('button', { name: '파일형 보기' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('preserves pinned status when opening a file source document', async () => {
    api.listPinnedDocumentApprovals.mockResolvedValue([{
      electronicApprovalId: 10,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: 'Sample Document',
      drafterName: 'Sample User',
      summary: 'Sample summary',
      createdAt: '2026-10-20T09:00:00Z',
    }]);
    render(<DocumentWritePage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '파일형 보기' }));

    fireEvent.click(await screen.findByRole('button', { name: 'direct.pdf 원문 보기' }));
    expect(await screen.findByRole('button', {
      name: '상단 고정 해제 Sample Document',
    })).toBeInTheDocument();
    expect(api.listPinnedDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
    );

    fireEvent.click(screen.getByRole('button', {
      name: '상단 고정 해제 Sample Document',
    }));
    await screen.findByRole('dialog', { name: '상단 고정 해제' });
    expect(api.unpinDocumentApproval).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
  });

  it('uses current scope and document kind when loading pinned state in file mode', async () => {
    api.getDocumentApprovalSummary.mockResolvedValue({
      actionRequiredCount: 1, inProgressCount: 0, draftCount: 0, completedCount: 0,
      revisionRequestedCount: 0, rejectedCount: 0,
      notices: [{
        electronicApprovalId: 10,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: 'Sample Document',
        drafterName: 'Sample User',
        summary: 'Sample summary',
        noticeType: 'ACTION_REQUIRED',
      }],
    });
    render(<DocumentWritePage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '파일형 보기' }));
    fireEvent.click(screen.getByRole('button', { name: /작성 중 문서/ }));
    await waitFor(() => expect(api.listPinnedDocumentApprovals).toHaveBeenLastCalledWith(
      'DRAFT',
      undefined,
      undefined,
    ));
    fireEvent.click(screen.getByRole('button', { name: '문서 업무구분 필터' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '기안서' }));
    await waitFor(() => expect(api.listPinnedDocumentApprovals).toHaveBeenLastCalledWith(
      'DRAFT',
      'DRAFTING',
      undefined,
    ));
    fireEvent.click(await screen.findByRole('button', { name: /결재 요청 도착/ }));
    await waitFor(() => expect(api.listPinnedDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      10,
    ));
  });
});
