import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { DocumentActionsMenu } from '../src/pages/groupware/documents/write/components/DocumentActionsMenu';
import { DocumentLinkPreviews } from '../src/pages/groupware/documents/write/components/DocumentLinkPreviews';
import {
  buildDocumentShareLink,
  extractExternalLinkUrls,
  extractDocumentShareIds,
  parseDocumentShareLink,
} from '../src/pages/groupware/documents/write/data/documentShareLink';
import {
  getExternalLinkPreview,
  getSharedDocumentPreview,
  listDocumentApprovals,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import { apiPost, ApiResponseError } from '../src/shared/services/apiClient';

vi.mock('../src/shared/services/apiClient', async (importOriginal) => ({
  ...await importOriginal<object>(), apiPost: vi.fn(),
}));

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', async (importOriginal) => ({
  ...await importOriginal<object>(),
  listDocumentApprovals: vi.fn(),
  getSharedDocumentPreview: vi.fn(),
  getExternalLinkPreview: vi.fn(),
}));

const link = (id: number) => `${window.location.origin}/groupware/doc/write?documentId=${id}`;
const record = {
  electronicApprovalId: 42, eabusNo: '001', documentType: 'DRAFTING' as const,
  documentNo: 'EA-20261028-0042',
  documentStatus: 'COMPLETED' as const, title: '공유 대상 문서',
  drafterName: '테스트 기안자', summary: '미리보기 요약',
};

beforeEach(() => {
  vi.mocked(listDocumentApprovals).mockResolvedValue([record]);
  vi.mocked(getSharedDocumentPreview).mockResolvedValue(record);
  vi.mocked(getExternalLinkPreview).mockResolvedValue({
    siteName: 'Example', title: 'External page', description: 'External summary',
    imageUrl: 'https://example.com/preview.png',
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('document share links', () => {
  it('copies a server-encrypted link without exposing the document ID or current filters', async () => {
    const token = `v1.${'A'.repeat(59)}`;
    vi.mocked(apiPost).mockResolvedValue({ item: { token } });
    expect(await buildDocumentShareLink(42)).toBe(`${window.location.origin}/groupware/doc/write?share=${token}`);
    expect(apiPost).toHaveBeenCalledWith('/api/v1/groupware/approvals/documents/42/share-link', {});
    expect(parseDocumentShareLink(`${window.location.origin}/groupware/doc/write?share=${token}`)).toBe(token);
    expect(parseDocumentShareLink(`${link(42)}&share=${token}`)).toBeNull();
  });

  it('recognizes only same-origin document links with one positive safe integer ID', () => {
    expect(parseDocumentShareLink(link(42))).toBe(42);
    for (const value of [
      'https://other.invalid/groupware/doc/write?documentId=42',
      `${window.location.origin}/other?documentId=42`,
      link(0), link(-1), link(1.5), link(Number.MAX_SAFE_INTEGER + 1),
      `${link(42)}&documentId=43`, `${window.location.origin}/groupware/doc/write?documentId=1e2`,
    ]) expect(parseDocumentShareLink(value)).toBeNull();
  });

  it('finds pasted text and anchors, ignores markup attributes and deduplicates IDs', () => {
    expect(extractDocumentShareIds(`<p>${link(42)}</p><a href="${link(43)}">문서</a>
      <a href="${link(42)}">중복</a><img src="${link(44)}">`)).toEqual([43, 42]);
  });

  it('keeps plain text previews when another paragraph follows the pasted URL', () => {
    expect(extractDocumentShareIds(`<p>${link(42)}</p><p>다음 문단</p>`)).toEqual([42]);
  });

  it('uses the edited destination rather than a stale URL label', () => {
    expect(extractDocumentShareIds(`<a href="https://example.com">${link(42)}</a>`)).toEqual([]);
    expect(extractDocumentShareIds(`<a href="${link(43)}">${link(42)}</a>`)).toEqual([43]);
  });

  it('extracts external absolute HTTP links without confusing internal shares or unsafe schemes', () => {
    const external = 'https://example.com/article';
    expect(extractExternalLinkUrls(`<p>${external}</p><a href="${external}">${link(42)}</a>
      <a href="${link(42)}">internal</a><a href="javascript:alert(1)">unsafe</a>
      <a href="https://user:pass@bad.example/">credentials</a>
      <a href="http://localhost/private">localhost</a>`)).toEqual([external]);
  });
});

describe('document sharing UI', () => {
  it('hides metadata when the encrypted link is denied by the server', async () => {
    vi.mocked(getSharedDocumentPreview).mockRejectedValueOnce(new ApiResponseError('denied', 404));
    render(<DocumentLinkPreviews html={`${window.location.origin}/groupware/doc/write?share=v1.${'A'.repeat(59)}`}
      onOpenDocument={vi.fn()} />);
    expect(await screen.findByText('접근할 수 없거나 삭제된 문서입니다.')).toBeInTheDocument();
    expect(screen.queryByText(record.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('resolves encrypted previews on the server and opens the returned readable document', async () => {
    const token = `v1.${'A'.repeat(59)}`;
    const onOpenDocument = vi.fn();
    render(<DocumentLinkPreviews html={`${window.location.origin}/groupware/doc/write?share=${token}`}
      onOpenDocument={onOpenDocument} />);
    fireEvent.click(await screen.findByRole('button', { name: /공유 대상 문서/ }));
    expect(getSharedDocumentPreview).toHaveBeenCalledWith(token);
    expect(onOpenDocument).toHaveBeenCalledWith(42);
    expect(listDocumentApprovals).not.toHaveBeenCalled();
  });

  it('keeps internal share links out of the external OG endpoint', async () => {
    render(<DocumentLinkPreviews html={`${link(42)}
      <a href="https://example.com/article">External article</a>`} onOpenDocument={vi.fn()} />);
    expect(await screen.findByRole('link', { name: /External page/ })).toHaveAttribute(
      'href', 'https://example.com/article',
    );
    expect(getExternalLinkPreview).toHaveBeenCalledOnce();
    expect(getExternalLinkPreview).toHaveBeenCalledWith('https://example.com/article');
    expect(listDocumentApprovals).toHaveBeenCalledWith('ALL', undefined, 42);
  });

  it('renders external OG cards distinctly and keeps the original link available on lookup failure', async () => {
    render(<DocumentLinkPreviews html="https://example.com/article" onOpenDocument={vi.fn()} />);
    const linkElement = await screen.findByRole('link', { name: /External page/ });
    expect(screen.queryByText('웹 링크', { exact: true })).not.toBeInTheDocument();
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('img', { name: 'External page' })).toHaveAttribute(
      'referrerPolicy', 'no-referrer',
    );

    vi.mocked(getExternalLinkPreview).mockRejectedValueOnce(new Error('offline'));
    cleanup();
    render(<DocumentLinkPreviews html="https://example.com/unavailable" onOpenDocument={vi.fn()} />);
    expect(await screen.findByText('웹 링크 미리보기를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /https:\/\/example.com\/unavailable/ })).toHaveAttribute(
      'href', 'https://example.com/unavailable',
    );
  });

  it('updates external previews after link edits and ignores stale lookup results', async () => {
    let resolveFirst: ((value: {
      siteName: string; title: string; description: string; imageUrl: null;
    }) => void) | undefined;
    const firstRequest = new Promise<{
      siteName: string; title: string; description: string; imageUrl: null;
    }>((resolve) => { resolveFirst = resolve; });
    vi.mocked(getExternalLinkPreview).mockImplementation((url) => url.endsWith('/first')
      ? firstRequest
      : Promise.resolve({
        siteName: 'Example', title: 'Updated page', description: 'Latest link', imageUrl: null,
      }));
    const { rerender } = render(<DocumentLinkPreviews html="https://example.com/first" />);
    rerender(<DocumentLinkPreviews html="https://example.com/second" />);

    expect(await screen.findByText('Updated page')).toBeInTheDocument();
    resolveFirst?.({ siteName: 'Example', title: 'Stale page', description: 'Old link', imageUrl: null });
    await waitFor(() => expect(screen.queryByText('Stale page')).not.toBeInTheDocument());
  });
  it('allows sharing a readable non-drafter document without exposing edit/delete', () => {
    const onShare = vi.fn();
    render(<DocumentActionsMenu isDrafter={false} documentStatus="COMPLETED"
      onShare={onShare} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '문서 공유하기' }));
    expect(onShare).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menuitem', { name: '문서 수정' })).not.toBeInTheDocument();
  });

  it('groups sharing and reference actions apart from available document management actions', () => {
    render(<DocumentActionsMenu isDrafter documentStatus="DRAFT"
      onShare={vi.fn()} onAddReferences={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent))
      .toEqual(['문서 공유하기', '참조자 추가하기', '문서 수정', '삭제']);
    const divider = within(menu).getByRole('separator');
    const referenceItem = within(menu).getByRole('menuitem', { name: '참조자 추가하기' });
    const editItem = within(menu).getByRole('menuitem', { name: '문서 수정' });
    expect(Boolean(referenceItem.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING))
      .toBe(true);
    expect(Boolean(divider.compareDocumentPosition(editItem) & Node.DOCUMENT_POSITION_FOLLOWING))
      .toBe(true);
  });

  it('does not render a divider when no document management actions are available', () => {
    render(<DocumentActionsMenu isDrafter={false} documentStatus="COMPLETED"
      onShare={vi.fn()} onAddReferences={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));

    expect(screen.getByRole('menuitem', { name: '참조자 추가하기' })).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('closes the menu and invokes only the selected reference action', async () => {
    const onShare = vi.fn();
    const onAddReferences = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DocumentActionsMenu isDrafter documentStatus="DRAFT"
      onShare={onShare} onAddReferences={onAddReferences} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '참조자 추가하기' }));

    expect(onAddReferences).toHaveBeenCalledOnce();
    expect(onShare).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('loads permission-filtered metadata and opens the right panel through its callback', async () => {
    const onOpenDocument = vi.fn();
    render(<DocumentLinkPreviews html={`<p>${link(42)}</p>`} onOpenDocument={onOpenDocument} />);
    fireEvent.click(await screen.findByRole('button', { name: /공유 대상 문서/ }));
    expect(listDocumentApprovals).toHaveBeenCalledWith('ALL', undefined, 42);
    expect(onOpenDocument).toHaveBeenCalledWith(42);
    expect(screen.getByText('미리보기 요약')).toBeInTheDocument();
  });

  it('does not disclose metadata or offer an open action for inaccessible documents', async () => {
    vi.mocked(listDocumentApprovals).mockResolvedValue([]);
    render(<DocumentLinkPreviews html={link(42)} onOpenDocument={vi.fn()} />);
    expect(await screen.findByText('접근할 수 없거나 삭제된 문서입니다.')).toBeInTheDocument();
    expect(screen.queryByText(record.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('can retry failed metadata lookups without retaining old content', async () => {
    vi.mocked(listDocumentApprovals).mockRejectedValueOnce(new Error('offline'));
    render(<DocumentLinkPreviews html={link(42)} onOpenDocument={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '미리보기 다시 시도' }));
    expect(await screen.findByText(record.title)).toBeInTheDocument();
    await waitFor(() => expect(listDocumentApprovals).toHaveBeenCalledTimes(2));
  });
});
