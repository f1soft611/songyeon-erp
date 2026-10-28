export type NoticeSummaryInput = {
  id: number;
  title: string;
  viewCount?: number | string | null;
  commentCount?: number | string | null;
  isPinned?: string | null;
  createdAt?: string | Date | null;
  attachmentCount?: number | null;
};

export type NoticeSummaryStat = {
  label: string;
  value: string;
};

export type NoticeRecentIssue = {
  id: number;
  title: string;
  viewCount: number;
  commentCount: number;
  score: number;
};

export type NoticeSummary = {
  stats: NoticeSummaryStat[];
  recentIssues: NoticeRecentIssue[];
};

const normalizeCount = (value: number | string | null | undefined): number => {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

const toDate = (value: string | Date | null | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getWeekStart = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
};

export function deriveNoticeSummary(
  notices: NoticeSummaryInput[],
  now = new Date(),
): NoticeSummary {
  const weekStart = getWeekStart(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const recentIssues = notices
    .map((notice) => {
      const viewCount = normalizeCount(notice.viewCount);
      const commentCount = normalizeCount(notice.commentCount);
      const createdAt = toDate(notice.createdAt);

      return {
        id: notice.id,
        title: notice.title,
        viewCount,
        commentCount,
        score: viewCount + commentCount,
        createdAt,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightTime = right.createdAt?.getTime() ?? 0;
      const leftTime = left.createdAt?.getTime() ?? 0;
      return rightTime - leftTime || right.id - left.id;
    })
    .slice(0, 3)
    .map(({ createdAt: _createdAt, ...issue }) => issue);

  const thisWeekCount = notices.filter((notice) => {
    const createdAt = toDate(notice.createdAt);
    return Boolean(
      createdAt && createdAt >= weekStart && createdAt < nextWeekStart,
    );
  }).length;

  const attachmentCount = notices.reduce(
    (total, notice) => total + normalizeCount(notice.attachmentCount),
    0,
  );

  return {
    stats: [
      { label: '전체 공지', value: String(notices.length) },
      { label: '이번 주', value: String(thisWeekCount) },
      {
        label: '상단 고정',
        value: String(
          notices.filter((notice) => notice.isPinned === 'Y').length,
        ),
      },
      { label: '첨부 문서', value: String(attachmentCount) },
    ],
    recentIssues,
  };
}
