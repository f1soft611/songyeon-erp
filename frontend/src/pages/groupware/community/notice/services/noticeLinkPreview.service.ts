import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import type { InternalContentPreview } from '../../../../../shared/components/feed/FeedLinkPreviews';
import { mapNoticePost } from '../data/noticePostAdapter';
import { getSharedNoticePreview } from './noticeBoardService';

export async function resolveNoticeLinkPreview(token: string): Promise<InternalContentPreview> {
  const post = await getSharedNoticePreview(token);
  let categoryName = '공지';
  if (post.noticeGubunCode) {
    try {
      const groups = await fetchCommonCodeGroups();
      const group = groups.find((item) => item.groupCode === 'NOTICE_GUBUN');
      if (group) {
        const items = await fetchCommonCodeItems(group.id);
        categoryName = items.find((item) => item.itemCode === post.noticeGubunCode)?.itemNm?.trim() || '공지';
      }
    } catch {
      categoryName = '공지';
    }
  }
  const notice = mapNoticePost(post);
  const writerName = post.writerName?.trim();
  return {
    id: notice.id,
    title: notice.title,
    subtitle: writerName ? `${categoryName} · ${writerName}` : categoryName,
    description: notice.summary,
  };
}
