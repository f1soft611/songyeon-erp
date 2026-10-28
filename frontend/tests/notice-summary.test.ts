import { describe, expect, it } from 'vitest';
import {
  deriveNoticeSummary,
  type NoticeSummaryInput,
} from '../src/pages/groupware/community/notice/data/noticeSummary';

const notices: NoticeSummaryInput[] = [
  {
    id: 1,
    title: '낮은 점수 공지',
    viewCount: 20,
    commentCount: 2,
    isPinned: 'N',
    createdAt: '2026-09-21T08:00:00+09:00',
    attachmentCount: 1,
  },
  {
    id: 2,
    title: '가장 많이 본 공지',
    viewCount: 100,
    commentCount: 4,
    isPinned: 'Y',
    createdAt: '2026-09-21T09:00:00+09:00',
    attachmentCount: 2,
  },
  {
    id: 3,
    title: '댓글이 많은 공지',
    viewCount: 40,
    commentCount: 80,
    isPinned: 'N',
    createdAt: '2026-09-21T07:00:00+09:00',
    attachmentCount: 0,
  },
  {
    id: 4,
    title: '동점 최신 공지',
    viewCount: 50,
    commentCount: 10,
    isPinned: 'N',
    createdAt: '2026-09-20T06:00:00+09:00',
    attachmentCount: 3,
  },
  {
    id: 5,
    title: '동점 이전 공지',
    viewCount: 50,
    commentCount: 10,
    isPinned: 'N',
    createdAt: '2026-09-18T09:00:00+09:00',
    attachmentCount: 0,
  },
];

describe('deriveNoticeSummary', () => {
  it('calculates live stats and ranks recent issues by views plus comments', () => {
    const result = deriveNoticeSummary(
      notices,
      new Date('2026-09-21T12:00:00+09:00'),
    );
    expect(result.stats).toEqual([
      { label: '전체 공지', value: '5' },
      { label: '이번 주', value: '3' },
      { label: '상단 고정', value: '1' },
      { label: '첨부 문서', value: '6' },
    ]);
    expect(result.recentIssues).toEqual([
      {
        id: 3,
        title: '댓글이 많은 공지',
        viewCount: 40,
        commentCount: 80,
        score: 120,
      },
      {
        id: 2,
        title: '가장 많이 본 공지',
        viewCount: 100,
        commentCount: 4,
        score: 104,
      },
      {
        id: 4,
        title: '동점 최신 공지',
        viewCount: 50,
        commentCount: 10,
        score: 60,
      },
    ]);
  });

  it('normalizes missing values and returns an empty state for no notices', () => {
    const result = deriveNoticeSummary(
      [
        {
          id: 9,
          title: '누락 데이터',
          viewCount: Number.NaN,
          commentCount: undefined,
          isPinned: 'N',
          createdAt: 'invalid-date',
        },
      ],
      new Date('2026-09-21T12:00:00+09:00'),
    );
    expect(result.stats).toEqual([
      { label: '전체 공지', value: '1' },
      { label: '이번 주', value: '0' },
      { label: '상단 고정', value: '0' },
      { label: '첨부 문서', value: '0' },
    ]);
    expect(result.recentIssues).toEqual([
      { id: 9, title: '누락 데이터', viewCount: 0, commentCount: 0, score: 0 },
    ]);
    expect(
      deriveNoticeSummary([], new Date('2026-09-21T12:00:00+09:00')),
    ).toEqual({
      stats: [
        { label: '전체 공지', value: '0' },
        { label: '이번 주', value: '0' },
        { label: '상단 고정', value: '0' },
        { label: '첨부 문서', value: '0' },
      ],
      recentIssues: [],
    });
  });
});
