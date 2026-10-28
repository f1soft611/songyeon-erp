import type { CommonViewItem } from '../../../../../shared/components/view-mode/commonViewTypes';
import type { NoticeFeedItem } from '../types/community.types';

export type NoticeViewItem = CommonViewItem & Pick<NoticeFeedItem, 'loginPopupYn' | 'popupEndDate' | 'noticeGubunCode'>;

function formatNoticeDate(value: NoticeFeedItem['createdAt']): string {
  if (!value) {
    return '날짜 미상';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '날짜 미상';
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveAuthorLabel(item: NoticeFeedItem): string {
  return item.meta.split('·')[0]?.trim() || '관리자';
}

export function toNoticeViewItem(item: NoticeFeedItem): NoticeViewItem {
  return {
    id: item.id,
    title: item.title,
    authorLabel: resolveAuthorLabel(item),
    dateLabel: formatNoticeDate(item.createdAt),
    isPinned: item.isPinned === 'Y',
    categoryLabel: item.noticeGubunName ?? item.noticeGubunCode ?? '공지',
    metaLabel: item.meta,
    summary: item.summary,
    loginPopupYn: item.loginPopupYn,
    popupEndDate: item.popupEndDate,
    noticeGubunCode: item.noticeGubunCode,
  };
}

export function toNoticeViewItems(items: NoticeFeedItem[]): NoticeViewItem[] {
  return items.map(toNoticeViewItem);
}
