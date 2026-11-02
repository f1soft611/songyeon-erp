import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from '../src/shared/components/rich-text-editor/RichTextEditor';
import { CommentThread } from '../src/shared/components/feed/CommentThread';
import { DocumentLinkPreviews } from '../src/pages/groupware/documents/write/components/DocumentLinkPreviews';
import { DocumentApprovalDetailFeed } from '../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import type { DocumentApprovalFeedRecord } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import { createDocumentShareToken, listDocumentApprovals } from '../src/pages/groupware/documents/write/services/documentApproval.service';

const notices = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock('../src/shared/context/NotificationContext', () => ({ useNotification: () => notices }));
vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', async (importOriginal) => ({
  ...await importOriginal<object>(), listDocumentApprovals: vi.fn(), createDocumentShareToken: vi.fn(),
}));

const url = () => `${window.location.origin}/groupware/doc/write?documentId=42`;
const encryptedUrl = () => `${window.location.origin}/groupware/doc/write?share=v1.${'A'.repeat(59)}`;
const record: DocumentApprovalFeedRecord = {
  electronicApprovalId: 42, eabusNo: '001', documentType: 'DRAFTING',
  documentNo: 'EA-20261028-0042',
  documentStatus: 'COMPLETED', title: '링크된 문서', drafterName: '테스트 기안자',
  summary: '문서 요약', contentsHtml: '<p>문서 본문</p>', contentsJson: '{}',
  contentsText: '문서 본문', viewCount: 0, isDrafter: false, draftingWorkCategoryId: null,
  approvalLines: [], attachments: [], systemEvents: [], comments: [],
  commentCount: 0, hasPreviousComments: false, nextBeforeCommentId: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listDocumentApprovals).mockResolvedValue([record]);
  vi.mocked(createDocumentShareToken).mockResolvedValue(`v1.${'A'.repeat(59)}`);
});
afterEach(() => { Reflect.deleteProperty(navigator, 'clipboard'); });

function paste(textbox: HTMLElement) {
  fireEvent.paste(textbox, {
    clipboardData: {
      getData: (type: string) => type === 'text/plain' ? url() : '',
      items: [], files: [], types: ['text/plain'],
    },
  });
}

describe('document link content integration', () => {
  it('previews a pasted body URL and removes its card when the editor is cleared', async () => {
    let editor: Editor | null = null;
    const onOpen = vi.fn();
    render(<RichTextEditor onEditorReady={(value) => { editor = value; }}
      renderContentPreview={(html) => <DocumentLinkPreviews html={html} onOpenDocument={onOpen} />} />);
    const textbox = await screen.findByRole('textbox', { name: '본문' });
    paste(textbox);
    fireEvent.click(await screen.findByRole('button', { name: '문서 상세 열기: 링크된 문서' }));
    expect(onOpen).toHaveBeenCalledWith(42);
    act(() => { editor?.commands.clearContent(); });
    await waitFor(() => expect(screen.queryByTestId('document-link-previews')).not.toBeInTheDocument());
  });

  it('previews a pasted comment URL without persisting the preview metadata', async () => {
    const onSubmit = vi.fn();
    render(<CommentThread onSubmitComment={onSubmit}
      renderContentPreview={(html) => <DocumentLinkPreviews html={html} onOpenDocument={vi.fn()} />} />);
    paste(await screen.findByRole('textbox', { name: '댓글 입력' }));
    expect(await screen.findByText('링크된 문서')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const savedHtml = onSubmit.mock.calls[0][0] as string;
    expect(savedHtml).toContain(url());
    expect(savedHtml).not.toContain('문서 요약');
  });

  it('updates preview cards when a template silently replaces the editor body', async () => {
    let editor: Editor | null = null;
    render(<RichTextEditor content={`<p>${url()}</p>`}
      onEditorReady={(value) => { editor = value; }}
      renderContentPreview={(html) => <DocumentLinkPreviews html={html} onOpenDocument={vi.fn()} />} />);
    expect(await screen.findByText('링크된 문서')).toBeInTheDocument();
    act(() => { editor?.commands.setContent('<p>링크 없는 새 양식</p>', { emitUpdate: false }); });
    await waitFor(() => expect(screen.queryByTestId('document-link-previews')).not.toBeInTheDocument());
    act(() => { editor?.commands.setContent(`<p>${url()}</p>`, { emitUpdate: false }); });
    expect(await screen.findByText('링크된 문서')).toBeInTheDocument();
  });

  it('removes the old card when editing only the link destination in a body', async () => {
    let editor: Editor | null = null;
    render(<RichTextEditor content={`<p><a href="${url()}">${url()}</a></p>`}
      onEditorReady={(value) => { editor = value; }}
      renderContentPreview={(html) => <DocumentLinkPreviews html={html} onOpenDocument={vi.fn()} />} />);
    expect(await screen.findByText('링크된 문서')).toBeInTheDocument();
    act(() => { editor?.chain().setTextSelection(5).extendMarkRange('link').setLink({ href: 'https://example.com' }).run(); });
    await waitFor(() => expect(screen.queryByTestId('document-link-previews')).not.toBeInTheDocument());
    expect(editor?.getText()).toBe(url());
  });

  it.each([false, true])('reports clipboard %s outcome from the actual feed menu', async (fails) => {
    const writeText = fails ? vi.fn().mockRejectedValue(new Error('denied')) : vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<DocumentApprovalDetailFeed presentation="feed" open electronicApprovalId={42}
      employeeId="1" detailRefreshToken={0} onActionComplete={vi.fn()} onEditDocument={vi.fn()}
      feedItem={{
        id: 42, title: record.title, kind: '기안서', status: '승인', author: record.drafterName,
        date: '', summary: record.summary, feedData: record,
      }} />);
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '문서 공유하기' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(encryptedUrl()));
    await waitFor(() => expect(fails ? notices.showError : notices.showSuccess).toHaveBeenCalledOnce());
    expect(fails ? notices.showSuccess : notices.showError).not.toHaveBeenCalled();
  });

  it('renders previews in stored comments, their edit editor and reply editor', async () => {
    render(<CommentThread comments={[{
      id: 1, author: '기안자', time: '', isEditable: true, content: `<p>${url()}</p>`,
    }]} onEditComment={vi.fn()} onSubmitReply={vi.fn()}
      renderContentPreview={(html) => <DocumentLinkPreviews html={html} onOpenDocument={vi.fn()} />} />);
    expect(await screen.findByText('링크된 문서')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 메뉴 기안자' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '수정' }));
    const edit = await screen.findByRole('textbox', { name: '댓글 수정 입력' });
    expect(within(edit.parentElement!.parentElement!).getByTestId('document-link-previews')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '답글' }));
    paste(await screen.findByRole('textbox', { name: '답글 입력' }));
    await waitFor(() => expect(screen.getAllByTestId('document-link-previews')).toHaveLength(2));
  });
});
