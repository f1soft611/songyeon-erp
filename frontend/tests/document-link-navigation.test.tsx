import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DocumentWritePage } from '../src/pages/groupware/documents/write/DocumentWritePage';
import { DocumentStatusDetail } from '../src/pages/groupware/documents/status/components/DocumentStatusDetail';
import { getSharedDocumentPreview } from '../src/pages/groupware/documents/write/services/documentApproval.service';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getSharedDocumentPreview: vi.fn(),
}));

const state = vi.hoisted(() => ({
  openDetail: vi.fn(),
  closeDetail: vi.fn(),
}));
vi.mock('../src/pages/groupware/documents/write/hooks/useDocumentWritePage', () => ({
  useDocumentWritePage: () => ({
    initialLoad: { loading: false, error: null },
    files: {}, viewMode: 'list', selectedKind: '', activeFilterChips: [],
    pinnedDocuments: [], listDocuments: [], feedDocuments: [],
    pinnedViewItems: [], listViewItems: [], summary: null, notices: [],
    openDetail: state.openDetail, closeDetail: state.closeDetail, detailDocumentId: null,
    isPinPending: () => false,
  }),
}));
vi.mock('../src/pages/groupware/documents/write/components/DocumentComposerDialog', () => ({
  DocumentComposerDialog: ({ onOpenDocument, linkedDetail }: {
    onOpenDocument: (id: number) => void; linkedDetail?: ReactNode;
  }) => <div data-testid="composer">
    <button onClick={() => onOpenDocument(42)}>작성 중 미리보기</button>{linkedDetail}
  </div>,
}));
vi.mock('../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed', () => ({
  DocumentApprovalDetailFeed: ({ electronicApprovalId, onClose }: {
    electronicApprovalId: number; onClose: () => void;
  }) => <section aria-label={`상세 ${electronicApprovalId}`}><button onClick={onClose}>링크 상세 닫기</button></section>,
}));
vi.mock('../src/shared/components/PageHeader', () => ({ PageHeader: () => null }));
vi.mock('../src/shared/context/NotificationContext', () => ({
  useNotification: () => ({ showError: vi.fn() }),
}));
const props = {
  selectedModule: { id: 'groupware', name: '그룹웨어', icon: null, tree: [], menus: [] },
  currentMenuName: '문서작성',
  content: { title: '문서작성', description: '', cards: [], items: [] },
};

beforeEach(() => { vi.clearAllMocks(); });

describe('shared document navigation', () => {
  it('also connects preview navigation in the reused status composer', async () => {
    render(<DocumentStatusDetail selectedDocumentId={null} editingDocument={null}
      isComposerOpen detailRefreshToken={0} onClose={vi.fn()} onActionComplete={vi.fn()}
      onEditDocument={vi.fn()} onComposerClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '작성 중 미리보기' }));
    const detail = await screen.findByRole('region', { name: '상세 42' });
    expect(detail.closest('[data-overlay-scope="page-content"]')).not.toBeNull();
    expect(document.querySelector('.MuiDrawer-root')).toBeNull();
  });
  it('opens the existing detail panel for a direct shared URL', async () => {
    render(<DocumentWritePage {...props} sharedDocumentId={42} />);
    await waitFor(() => expect(state.openDetail).toHaveBeenCalledWith(42));
  });

  it('resolves a direct encrypted URL before opening the detail', async () => {
    vi.mocked(getSharedDocumentPreview).mockResolvedValue({
      electronicApprovalId: 42, documentNo: 'EA-20261028-0042', eabusNo: '001',
      documentType: 'DRAFTING', documentStatus: 'COMPLETED', title: '공유 문서',
      drafterName: '기안자', summary: '요약',
    });
    const token = `v1.${'A'.repeat(59)}`;
    render(<DocumentWritePage {...props} sharedDocumentId={token} />);
    await waitFor(() => expect(state.openDetail).toHaveBeenCalledWith(42));
    expect(getSharedDocumentPreview).toHaveBeenCalledWith(token);
  });

  it('opens a right-side detail from a composer preview and closes only that detail', async () => {
    render(<DocumentWritePage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '작성 중 미리보기' }));
    expect(await screen.findByRole('region', { name: '상세 42' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '링크 상세 닫기' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: '상세 42' })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: '작성 중 미리보기' })).toBeInTheDocument();
  });
});
