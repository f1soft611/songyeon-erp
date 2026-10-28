import { describe, expect, it } from 'vitest';
import { toNoticeViewItem } from '../src/pages/groupware/community/notice/data/noticeViewAdapter';
import type { NoticeFeedItem } from '../src/pages/groupware/community/notice/data/noticeData';

const item: NoticeFeedItem = {
  id: 42,
  title: '시스템 점검 안내',
  meta: '관리자 · 2026. 09. 21. · 조회 3',
  state: '상단 고정',
  summary: '점검 안내 요약',
  body: '점검 안내 본문',
  createdAt: '2026-09-21T10:30:00+09:00',
  isPinned: 'Y',
  isPinned: 'Y',
  commentCount: 2,
};

describe('notice view adapter', () => {
  it('preserves popup configuration for list and pinned-row badges', () => {
    expect(toNoticeViewItem({ ...item, loginPopupYn: 'Y', popupEndDate: '2026-10-31', noticeGubunCode: 'GENERAL' }))
      .toMatchObject({ loginPopupYn: 'Y', popupEndDate: '2026-10-31', noticeGubunCode: 'GENERAL' });
  });
  it('maps notice data to a reusable view item', () => {
    expect(toNoticeViewItem(item)).toMatchObject({
      id: 42,
      title: '시스템 점검 안내',
      authorLabel: '관리자',
      isPinned: true,
      dateLabel: expect.stringContaining('2026'),
    });
  });
});
