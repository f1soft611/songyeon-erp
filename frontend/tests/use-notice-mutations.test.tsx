import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoticeFeedItem } from '../src/pages/groupware/community/notice/types/community.types';

const serviceMocks = vi.hoisted(() => ({
  createNoticePost: vi.fn(),
  deleteNoticePost: vi.fn(),
  deleteNoticeAttachment: vi.fn(),
  updateNoticePinned: vi.fn(),
  updateNoticePost: vi.fn(),
  uploadNoticeAttachment: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => serviceMocks,
);

import { useNoticeMutations } from '../src/pages/groupware/community/notice/hooks/useNoticeMutations';

const notice: NoticeFeedItem = {
  id: 12,
  title: '삭제 대상',
  meta: '작성자 · 날짜 · 조회 0',
  state: '공지',
  summary: '본문',
  body: '본문',
  commentCount: 0,
};

describe('useNoticeMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a notice and removes it from the local list', async () => {
    const showError = vi.fn();
    const showSuccess = vi.fn();
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState([notice]);
      const mutations = useNoticeMutations({
        noticeItems,
        setNoticeItems,
        pinnedNoticeItems: [],
        setPinnedNoticeItems: () => undefined,
        setServerItemRevision: () => undefined,
        loadNoticePosts: vi.fn(),
        noticeGubunNamesRef: { current: new Map() },
        editorDraft: { title: '', body: '', attachments: [] },
        setEditorDraft: vi.fn(),
        closeComposer: vi.fn(),
        showError,
        showSuccess,
      });
      return { noticeItems, mutations };
    });

    await act(async () => {
      await result.current.mutations.handleDeleteNotice(12);
    });

    expect(serviceMocks.deleteNoticePost).toHaveBeenCalledWith(12);
    expect(result.current.noticeItems).toEqual([]);
    expect(showSuccess).toHaveBeenCalledWith('공지가 삭제되었습니다.');
    expect(showError).not.toHaveBeenCalled();
  });

  it('creates a notice with the original body payload and refreshes the list', async () => {
    serviceMocks.createNoticePost.mockResolvedValue({ postId: 31 });
    const loadNoticePosts = vi.fn().mockResolvedValue(undefined);
    const setEditorDraft = vi.fn();
    const closeComposer = vi.fn();
    const showSuccess = vi.fn();
    const { result } = renderHook(() =>
      useNoticeMutations({
        setNoticeItems: vi.fn(),
        setPinnedNoticeItems: vi.fn(),
        setServerItemRevision: vi.fn(),
        loadNoticePosts,
        noticeGubunNamesRef: { current: new Map() },
        editorDraft: { title: '', body: '', attachments: [] },
        setEditorDraft,
        closeComposer,
        showError: vi.fn(),
        showSuccess,
      }),
    );

    await act(async () => {
      await result.current.handleSaveNotice({
        title: '  신규 공지  ',
        noticeGubunCode: 'OPS',
        loginPopupYn: 'Y',
        popupEndDate: '2026-10-31',
        body: '<p>본문</p>',
        bodyJson: '{"type":"doc"}',
        bodyText: '본문',
        attachments: [],
        removedAttachmentIds: [],
        embeddedImages: [],
        temporaryImages: [{ uploadToken: 'temp-1', fileName: 'image.png' }],
      });
    });

    expect(serviceMocks.createNoticePost).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '신규 공지',
        contents: '<p>본문</p>',
        contentsHtml: '<p>본문</p>',
        contentsJson: '{"type":"doc"}',
        contentsText: '본문',
        noticeGubunCode: 'OPS',
        loginPopupYn: 'Y',
        popupEndDate: '2026-10-31',
        embeddedImages: [],
        temporaryImages: [{ uploadToken: 'temp-1', fileName: 'image.png' }],
      }),
    );
    expect(loadNoticePosts).toHaveBeenCalledWith({ silent: true });
    expect(setEditorDraft).toHaveBeenCalledWith({
      title: '',
      body: '',
      noticeGubunCode: '',
      attachments: [],
    });
    expect(closeComposer).toHaveBeenCalledOnce();
    expect(showSuccess).toHaveBeenCalledWith('공지사항이 등록되었습니다.');
  });

  it('forwards temporary image session metadata when updating a notice', async () => {
    serviceMocks.updateNoticePost.mockResolvedValue({ postId: 12 });
    const { result } = renderHook(() =>
      useNoticeMutations({
        setNoticeItems: vi.fn(),
        setPinnedNoticeItems: vi.fn(),
        setServerItemRevision: vi.fn(),
        loadNoticePosts: vi.fn().mockResolvedValue(undefined),
        noticeGubunNamesRef: { current: new Map() },
        editorDraft: {
          id: 12,
          title: '기존 공지',
          body: '<p>본문</p>',
          attachments: [],
        },
        setEditorDraft: vi.fn(),
        closeComposer: vi.fn(),
        showError: vi.fn(),
        showSuccess: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSaveNotice({
        title: '수정 공지',
        noticeGubunCode: 'OPS',
        body: '<p>본문</p>',
        bodyJson: '{"type":"doc"}',
        bodyText: '본문',
        attachments: [],
        removedAttachmentIds: [],
        embeddedImages: [],
        temporaryImages: [{ uploadToken: 'temp-2', fileName: 'unused.png' }],
      });
    });

    expect(serviceMocks.updateNoticePost).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        embeddedImages: [],
        temporaryImages: [{ uploadToken: 'temp-2', fileName: 'unused.png' }],
      }),
    );
  });

  it('updates a pinned notice body in both local lists after save', async () => {
    const updatedBody =
      '<table><tbody><tr><td>수정된 본문</td></tr></tbody></table>';
    serviceMocks.updateNoticePost.mockResolvedValue({
      postId: 12,
      title: '수정 공지',
      noticeGubunCode: 'OPS',
      contents: updatedBody,
      contentsHtml: updatedBody,
      contentsText: '수정된 본문',
      isPinned: 'Y',
    });
    const pinnedNotice = {
      ...notice,
      isPinned: 'Y',
      body: '이전 본문',
      bodyHtml: '<p>이전 본문</p>',
    };
    const { result } = renderHook(() => {
      const [noticeItems, setNoticeItems] = useState<NoticeFeedItem[]>([]);
      const [pinnedNoticeItems, setPinnedNoticeItems] = useState<
        NoticeFeedItem[]
      >([pinnedNotice]);
      const mutations = useNoticeMutations({
        noticeItems,
        setNoticeItems,
        pinnedNoticeItems,
        setPinnedNoticeItems,
        setServerItemRevision: () => undefined,
        loadNoticePosts: vi.fn().mockResolvedValue(undefined),
        noticeGubunNamesRef: { current: new Map() },
        editorDraft: {
          id: 12,
          title: '기존 공지',
          body: '<p>이전 본문</p>',
          isPinned: 'Y',
          attachments: [],
        },
        setEditorDraft: vi.fn(),
        closeComposer: vi.fn(),
        showError: vi.fn(),
        showSuccess: vi.fn(),
      });
      return { noticeItems, pinnedNoticeItems, mutations };
    });

    await act(async () => {
      await result.current.mutations.handleSaveNotice({
        title: '수정 공지',
        noticeGubunCode: 'OPS',
        body: updatedBody,
        bodyJson: '{"type":"doc"}',
        bodyText: '수정된 본문',
        attachments: [],
        removedAttachmentIds: [],
        embeddedImages: [],
        temporaryImages: [],
      });
    });

    expect(result.current.pinnedNoticeItems[0].bodyHtml).toBe(updatedBody);
    expect(result.current.pinnedNoticeItems[0].summary).toBe('수정된 본문');
    expect(result.current.noticeItems).toEqual([]);
  });
});
