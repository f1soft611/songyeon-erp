import { describe, expect, it } from 'vitest';
import type { NoticeCommentItem } from '../src/pages/groupware/community/notice/types/community.types';
import {
  appendCommentToTree,
  deleteCommentFromTree,
  insertNoticeReplyAfter,
} from '../src/pages/groupware/community/notice/data/noticeCommentTree';
import { toNoticeCommentTree } from '../src/pages/groupware/community/notice/data/noticePostAdapter';

const root: NoticeCommentItem = {
  id: 10,
  author: '작성자',
  time: '방금',
  content: '원 댓글',
  attachments: [{ id: 'file-1', name: 'a.pdf' }],
  replies: [],
};

describe('notice comment tree helpers', () => {
  it('allows editing only notice comments written by the current user', () => {
    localStorage.setItem(
      'songyeon-erp-auth',
      JSON.stringify({ userId: 'current-user' }),
    );

    const [owned, other, missingWriter, deleted] = toNoticeCommentTree([
      { commentId: 1, writerId: 'current-user' },
      { commentId: 2, writerId: 'another-user' },
      { commentId: 3 },
      {
        commentId: 4,
        writerId: 'current-user',
        deletedYn: 'Y',
      },
    ]);

    expect(owned.isEditable).toBe(true);
    expect(other.isEditable).toBe(false);
    expect(missingWriter.isEditable).toBe(false);
    expect(deleted.isEditable).toBe(false);

    localStorage.removeItem('songyeon-erp-auth');
    const [withoutAuth] = toNoticeCommentTree([
      { commentId: 5, writerId: 'current-user' },
    ]);
    expect(withoutAuth.isEditable).toBe(false);
  });

  it('appends replies to their parent and inserts a display reply after a target', () => {
    const reply: NoticeCommentItem = {
      id: 11,
      author: '답글 작성자',
      time: '방금',
      content: '답글',
    };
    const nested = appendCommentToTree([root], 10, reply);

    expect(nested[0].replies).toEqual([reply]);
    expect(
      insertNoticeReplyAfter([root], 10, reply).map((item) => item.id),
    ).toEqual([10, 11]);
  });

  it('soft-deletes a comment and clears its attachments', () => {
    const [deleted] = deleteCommentFromTree([root], 10);

    expect(deleted.isDeleted).toBe(true);
    expect(deleted.isEditable).toBe(false);
    expect(deleted.attachments).toEqual([]);
  });
});
