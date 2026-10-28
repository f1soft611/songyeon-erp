import { describe, expect, it } from 'vitest';
import {
  mapNoticePost,
  toPlainText,
} from '../src/pages/groupware/community/notice/data/noticePostAdapter';

describe('notice post data adapter', () => {
  it('converts rich text to plain text while keeping block boundaries', () => {
    expect(toPlainText('<p>첫 줄</p><p>둘째<br>셋째</p>')).toBe(
      '첫 줄\n\n둘째\n셋째',
    );
  });

  it('maps API posts, filters embedded files, and nests comment replies', () => {
    const item = mapNoticePost(
      {
        postId: 25,
        title: '점검 안내',
        noticeGubunCode: 'OPS',
        contentsHtml: '<p>서버 점검 일정입니다.</p>',
        writerName: '운영팀',
        writerProfileImage: 'data:image/png;base64,notice-author',
        viewCount: 8,
        attachments: [
          { boardFileId: 1, fileName: '안내.pdf', fileUsageType: 'ATTACHMENT' },
          { boardFileId: 2, fileName: '본문.png', fileUsageType: 'EMBEDDED' },
        ],
        comments: [
          {
            commentId: 100,
            writerName: '사용자',
            writerProfileImage: 'data:image/png;base64,comment-author',
            content: '확인했습니다.',
            attachments: [
              {
                fileId: 10,
                fileName: '확인.png',
                fileSize: 456,
                mimeType: 'image/png',
              },
            ],
          },
          {
            commentId: 101,
            parentCommentId: 100,
            writerName: '운영팀',
            writerProfileImage: 'data:image/png;base64,reply-author',
            content: '감사합니다.',
            attachments: [
              {
                fileId: 11,
                fileName: '답글.jpg',
                fileSize: 789,
                contentType: 'image/jpeg',
              },
            ],
          },
        ],
      },
      new Map([['OPS', '운영']]),
    );

    expect(item.id).toBe(25);
    expect(item.writerProfileImage).toBe('data:image/png;base64,notice-author');
    expect(item.summary).toBe('서버 점검 일정입니다.');
    expect(item.noticeGubunName).toBe('운영');
    expect(item.attachments).toEqual(['안내.pdf']);
    expect(item.comments).toHaveLength(1);
    expect(item.comments?.[0].authorProfileImageUrl).toBe(
      'data:image/png;base64,comment-author',
    );
    expect(item.comments?.[0].replies?.[0].content).toBe('감사합니다.');
    expect(item.comments?.[0].replies?.[0].authorProfileImageUrl).toBe(
      'data:image/png;base64,reply-author',
    );
    expect(item.comments?.[0].attachments?.[0]).toMatchObject({
      id: '10',
      name: '확인.png',
      size: 456,
      mimeType: 'image/png',
    });
    expect(item.comments?.[0].replies?.[0].attachments?.[0]).toMatchObject({
      id: '11',
      name: '답글.jpg',
      size: 789,
      mimeType: 'image/jpeg',
    });
  });
});
