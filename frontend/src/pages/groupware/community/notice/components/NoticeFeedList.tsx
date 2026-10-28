import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { FeedCard } from '../../../../../shared/components/feed/FeedCard';
import { FeedBodyContent } from '../../../../../shared/components/feed/FeedBodyContent';
import { FeedCommentsSection } from '../../../../../shared/components/feed/FeedCommentsSection';
import { FeedReactionBar } from '../../../../../shared/components/feed/FeedReactionBar';
import { FeedView } from '../../../../../shared/components/view-mode/FeedView';
import { ImageViewerDialog } from '../../../../../shared/components/ImageViewerDialog';
import type {
  NoticeCommentItem,
  NoticeFeedItem,
} from '../types/community.types';
import { prepareNoticeFeedHtml } from '../utils/noticeHtml';
import { resolveApiBaseUrl } from '../../../../../shared/services/authService';
import { apiGetBlob } from '../../../../../shared/services/apiClient';
import { fetchCommonFileBlob } from '../../../../../shared/services/commonContentApi';
import { NoticeLoginPopupBadge } from './NoticeLoginPopupBadge';
import { NoticeCategoryBadge } from './NoticeCategoryBadge';

type NoticeFeedListProps = {
  items: NoticeFeedItem[];
  isDark: boolean;
  expandedNoticeId?: number | null;
  isRefreshing?: boolean;
  onToggleExpand?: (id: number) => Promise<void> | void;
  onNoticeInteract?: (id: number) => Promise<void> | void;
  onToggleLike?: (id: number) => void;
  onToggleBookmark?: (id: number) => void;
  onAddComment?: (
    noticeId: number,
    content: string,
    parentCommentId?: number | string,
    files?: File[],
    displayParentCommentId?: number | string,
  ) => Promise<NoticeCommentItem | void> | NoticeCommentItem | void;
  onEditComment?: (
    noticeId: number,
    commentId: number | string,
    content: string,
    files?: File[],
  ) => Promise<void> | void;
  onDeleteComment?: (
    noticeId: number,
    commentId: number | string,
  ) => Promise<void> | void;
  onDelete?: (noticeId: number) => void;
  onTogglePinned?: (item: NoticeFeedItem) => void;
  onEdit?: (item: NoticeFeedItem) => void;
  onDownload?: (
    noticeId: number,
    file: {
      id: string;
      name: string;
      size?: number;
      boardFileId?: number | string | null;
      objectKey?: string | null;
      bucketName?: string | null;
    },
  ) => void;
  onLoadPreviousComments?: (
    noticeId: number,
    beforeCommentId: number | string,
  ) => Promise<{
    comments: NoticeCommentItem[];
    hasPrevious: boolean;
    nextBeforeCommentId?: number | string | null;
  }>;
  onLoadPreviousCommentsError?: (error: unknown) => void;
  onDownloadCommentAttachment?: (
    commentId: number | string,
    attachmentId: string,
    fileName?: string,
  ) => void;
  onDeleteCommentAttachment?: (
    noticeId: number,
    commentId: number | string,
    attachmentId: string,
  ) => void;
  pagination?: {
    scrollRoot: Element | null;
    hasNext: boolean;
    isLoadingMore: boolean;
    error?: string;
    onLoadMore: () => void;
    onRetry?: () => void;
    loadingLabel?: string;
  };
  serverItemRevision?: number;
};

type NoticeCommentImagePreview = {
  previewUrl?: string;
  previewError?: string;
};

function getNoticeCommentImageKey(
  noticeId: number,
  commentId: number | string,
  attachmentId: string,
): string {
  return `${noticeId}:${commentId}:${attachmentId}`;
}

function getNoticeCommentImageAttachments(
  comments: NoticeCommentItem[],
): Array<{
  commentId: number;
  attachmentId: string;
}> {
  return comments.flatMap((comment) => [
    ...(comment.attachments ?? [])
      .filter((attachment) => attachment.mimeType?.startsWith('image/'))
      .map((attachment) => ({
        commentId: comment.id,
        attachmentId: attachment.id,
      })),
    ...getNoticeCommentImageAttachments(comment.replies ?? []),
  ]);
}

function normalizeCommentTree(
  comments: NoticeCommentItem[] = [],
  noticeId: number,
  imagePreviews: Record<string, NoticeCommentImagePreview>,
): FeedCommentItem[] {
  const normalizedById = new Map<string, FeedCommentItem>();

  comments.forEach((comment) => {
    normalizedById.set(String(comment.id), {
      id: comment.id,
      author: comment.author,
      authorProfileImageUrl: comment.authorProfileImageUrl,
      time: comment.time,
      content: comment.content,
      isEditable: comment.isEditable,
      isDeleted: comment.isDeleted,
      attachments: (comment.attachments ?? []).map((attachment) => ({
        ...attachment,
        ...imagePreviews[
          getNoticeCommentImageKey(noticeId, comment.id, attachment.id)
        ],
      })),
      replies: normalizeCommentTree(
        comment.replies ?? [],
        noticeId,
        imagePreviews,
      ),
    });
  });

  return Array.from(normalizedById.values());
}

function countComments(comments: NoticeCommentItem[]): number {
  return comments.filter((comment) => !comment.isDeleted).length;
}

function countLoadedComments(comments: NoticeCommentItem[]): number {
  return comments.reduce(
    (total, comment) =>
      total +
      (comment.isDeleted ? 0 : 1) +
      countLoadedComments(comment.replies ?? []),
    0,
  );
}

function appendCommentToTree(
  comments: NoticeCommentItem[],
  parentCommentId: number | string | null | undefined,
  comment: NoticeCommentItem,
): NoticeCommentItem[] {
  if (parentCommentId == null) {
    return [...comments, comment];
  }

  return comments.map((current) =>
    String(current.id) === String(parentCommentId)
      ? { ...current, replies: [...(current.replies ?? []), comment] }
      : {
          ...current,
          replies: appendCommentToTree(
            current.replies ?? [],
            parentCommentId,
            comment,
          ),
        },
  );
}

function insertNoticeReplyAfter(
  comments: NoticeCommentItem[],
  targetCommentId: number | string,
  comment: NoticeCommentItem,
): NoticeCommentItem[] {
  const nextComments: NoticeCommentItem[] = [];

  comments.forEach((current) => {
    nextComments.push(current);
    if (String(current.id) === String(targetCommentId)) {
      nextComments.push({ ...comment, replies: [] });
      return;
    }

    if (current.replies?.length) {
      nextComments[nextComments.length - 1] = {
        ...current,
        replies: insertNoticeReplyAfter(
          current.replies,
          targetCommentId,
          comment,
        ),
      };
    }
  });

  return nextComments;
}

export function mergeCommentTrees(
  current: NoticeCommentItem[],
  incoming: NoticeCommentItem[],
  incomingFirst = true,
): NoticeCommentItem[] {
  const primary = incomingFirst ? incoming : current;
  const secondary = incomingFirst ? current : incoming;
  const result = primary.map((comment) => ({
    ...comment,
    replies: mergeCommentTrees([], comment.replies ?? []),
  }));
  const byId = new Map(result.map((comment) => [String(comment.id), comment]));

  secondary.forEach((comment) => {
    const existing = byId.get(String(comment.id));
    if (!existing) {
      const copy = {
        ...comment,
        replies: mergeCommentTrees([], comment.replies ?? []),
      };
      byId.set(String(copy.id), copy);
      result.push(copy);
      return;
    }

    existing.replies = mergeCommentTrees(
      existing.replies ?? [],
      comment.replies ?? [],
    );
  });

  return result;
}

function collectCommentIds(comments: NoticeCommentItem[]): Set<string> {
  const ids = new Set<string>();
  const visit = (items: NoticeCommentItem[]) => {
    items.forEach((comment) => {
      ids.add(String(comment.id));
      visit(comment.replies ?? []);
    });
  };
  visit(comments);
  return ids;
}

export type NoticeEmbeddedImagePreview = {
  src: string;
  alt: string;
};

const NOTICE_IMAGE_PREVIEW_WIDTH = 112;
const NOTICE_IMAGE_PREVIEW_HEIGHT = 76;

export function extractNoticeEmbeddedImagePreviews(
  html: string,
): NoticeEmbeddedImagePreview[] {
  if (typeof DOMParser === 'undefined') {
    return Array.from(
      html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
    ).map((match) => ({ src: match[1], alt: '본문 이미지' }));
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.querySelectorAll('img'))
    .map((image) => ({
      src: image.getAttribute('src') ?? '',
      alt: image.getAttribute('alt') || '본문 이미지',
    }))
    .filter((image) => image.src);
}

export function normalizeNoticeEmbeddedImageSources(
  html: string,
  postId: number,
): string {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('data-upload-token');
    image.removeAttribute('data-upload-state');
    const objectKey = image.getAttribute('data-object-key');
    if (!objectKey) {
      return;
    }
    image.setAttribute(
      'src',
      `${resolveApiBaseUrl()}/api/v1/groupware/boards/notice/posts/${postId}/embedded-images?objectKey=${encodeURIComponent(objectKey)}`,
    );
  });
  return document.body.innerHTML;
}

function deferNoticeEmbeddedImageSources(html: string): string {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    const source = image.getAttribute('src') ?? '';
    if (!source.includes('/api/v1/groupware/boards/notice/posts/')) {
      return;
    }
    image.setAttribute('data-notice-embedded-image-source', source);
    image.removeAttribute('src');
  });
  return document.body.innerHTML;
}

type AuthenticatedNoticeImageProps = {
  src: string;
  alt: string;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  sx?: SxProps<Theme>;
};

export function AuthenticatedNoticeImage({
  src,
  alt,
  onLoad,
  onClick,
  sx,
}: AuthenticatedNoticeImageProps) {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    let nextObjectUrl: string | undefined;
    setObjectUrl(undefined);

    if (!src.includes('/api/v1/groupware/boards/notice/posts/')) {
      setObjectUrl(src);
      return;
    }

    void apiGetBlob(src)
      .then((blob) => {
        nextObjectUrl = URL.createObjectURL(blob);
        if (active) {
          setObjectUrl(nextObjectUrl);
        } else {
          URL.revokeObjectURL(nextObjectUrl);
        }
      })
      .catch(() => setObjectUrl(undefined));

    return () => {
      active = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [src]);

  return (
    <Box
      component="img"
      src={objectUrl}
      alt={alt}
      onLoad={onLoad}
      onClick={onClick}
      sx={sx}
    />
  );
}

export function removeNoticeEmbeddedImages(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<img\b[^>]*>/gi, '');
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => image.remove());
  return document.body.innerHTML;
}

function prepareNoticeBodyHtml(item: NoticeFeedItem): string {
  return deferNoticeEmbeddedImageSources(
    prepareNoticeFeedHtml(
      normalizeNoticeEmbeddedImageSources(item.bodyHtml ?? item.body, item.id),
    ),
  );
}

type NoticeImageDimensions = {
  width: number;
  height: number;
};

type NoticeImageLayout = {
  width: string;
  aspectRatio: string;
};

function parsePixelDimension(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim());
  if (!match) return null;
  const dimension = Number(match[1]);
  return dimension > 0 ? dimension : null;
}

function getDeclaredNoticeImageLayout(
  image: HTMLImageElement,
): NoticeImageLayout | null {
  const widthAttribute = parsePixelDimension(image.getAttribute('width'));
  const heightAttribute = parsePixelDimension(image.getAttribute('height'));
  const widthStyle = image.style.width.trim();
  const width =
    widthStyle && /^(?:\d+(?:\.\d+)?(?:px|%|vw|rem|em))$/.test(widthStyle)
      ? widthStyle
      : widthAttribute
        ? `${widthAttribute}px`
        : '';
  const widthForRatio = parsePixelDimension(widthStyle) ?? widthAttribute;
  const heightForRatio =
    parsePixelDimension(image.style.height) ?? heightAttribute;
  const aspectRatio =
    image.style.aspectRatio ||
    (widthForRatio && heightForRatio
      ? `${widthForRatio} / ${heightForRatio}`
      : '');

  return width && aspectRatio ? { width, aspectRatio } : null;
}

function createNoticeImageSkeleton(
  document: Document,
  noticeId: number,
  index: number,
  layout: NoticeImageLayout,
): HTMLSpanElement {
  const skeleton = document.createElement('span');
  skeleton.setAttribute('data-notice-expanded-image-skeleton', 'true');
  skeleton.setAttribute(
    'data-testid',
    `notice-expanded-image-skeleton-${noticeId}-${index}`,
  );
  skeleton.setAttribute('role', 'status');
  skeleton.setAttribute('aria-label', '본문 이미지 불러오는 중');
  skeleton.style.display = 'inline-block';
  skeleton.style.width = layout.width;
  skeleton.style.aspectRatio = layout.aspectRatio;
  skeleton.style.maxWidth = '100%';
  skeleton.style.height = 'auto';
  skeleton.style.verticalAlign = 'middle';
  return skeleton;
}

function prepareExpandedNoticeLoadingHtml(
  html: string,
  noticeId: number,
): string {
  if (!html || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(
      'img[data-notice-embedded-image-source]',
    ),
  );
  images.forEach((image, index) => {
    const layout = getDeclaredNoticeImageLayout(image);
    if (layout) {
      image.replaceWith(
        createNoticeImageSkeleton(document, noticeId, index, layout),
      );
      return;
    }
    image.replaceWith(
      document.createComment(`notice-image-${noticeId}-${index}`),
    );
  });
  return document.body.innerHTML;
}

async function decodeNoticeImage(
  objectUrl: string,
): Promise<NoticeImageDimensions> {
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error('Decoded notice image has no intrinsic dimensions');
  }
  return { width: image.naturalWidth, height: image.naturalHeight };
}

function waitForRenderedFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      window.setTimeout(resolve, 0);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

type HydratedNoticeBody = {
  noticeId: number;
  sourceHtml: string;
  html: string;
  hasImageLoadError: boolean;
};

export function NoticeFeedList({
  items,
  isDark,
  expandedNoticeId,
  onToggleExpand,
  onNoticeInteract,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onDelete,
  onTogglePinned,
  onEdit,
  onDownload,
  onLoadPreviousComments,
  onLoadPreviousCommentsError,
  onDownloadCommentAttachment,
  onDeleteCommentAttachment,
  pagination,
  serverItemRevision = 0,
}: NoticeFeedListProps) {
  const [localCommentsByNoticeId, setLocalCommentsByNoticeId] = useState<
    Record<number, NoticeCommentItem[]>
  >({});
  const [loadedPreviousByNoticeId, setLoadedPreviousByNoticeId] = useState<
    Record<number, boolean>
  >({});
  const [previousCursorByNoticeId, setPreviousCursorByNoticeId] = useState<
    Record<number, number | string | undefined>
  >({});
  const [loadingPreviousByNoticeId, setLoadingPreviousByNoticeId] = useState<
    Record<number, boolean>
  >({});
  const [exhaustedPreviousByNoticeId, setExhaustedPreviousByNoticeId] =
    useState<Record<number, boolean>>({});
  const [noticeMenuAnchor, setNoticeMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [noticeMenuId, setNoticeMenuId] = useState<number | null>(null);
  const [viewerImage, setViewerImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [loadedImageKeys, setLoadedImageKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const expandedNotice = items.find((item) => item.id === expandedNoticeId);
  const expandedBodySourceHtml = expandedNotice
    ? prepareNoticeBodyHtml(expandedNotice)
    : '';
  const expandedBodyLoadingHtml = expandedNotice
    ? prepareExpandedNoticeLoadingHtml(
        expandedBodySourceHtml,
        expandedNotice.id,
      )
    : '';
  const [hydratedNoticeBody, setHydratedNoticeBody] =
    useState<HydratedNoticeBody | null>(null);
  const serverCommentSnapshots = useRef<Record<number, string>>({});
  const previousCommentIdsByNoticeId = useRef<Record<number, Set<string>>>({});
  const serverItemRevisionRef = useRef<number | undefined>(undefined);
  const expandedCommentItems = useMemo(
    () =>
      expandedNotice
        ? (localCommentsByNoticeId[expandedNotice.id] ??
          expandedNotice.comments ??
          [])
        : [],
    [expandedNotice, localCommentsByNoticeId],
  );
  const visibleExpandedComments = useMemo(
    () =>
      expandedNotice &&
      !loadedPreviousByNoticeId[expandedNotice.id] &&
      expandedCommentItems.length > 3
        ? expandedCommentItems.slice(-3)
        : expandedCommentItems,
    [expandedCommentItems, expandedNotice, loadedPreviousByNoticeId],
  );
  const expandedCommentImages = useMemo(
    () => getNoticeCommentImageAttachments(visibleExpandedComments),
    [visibleExpandedComments],
  );
  const commentImageRequestKey = JSON.stringify(
    expandedCommentImages.map(({ commentId, attachmentId }) => [
      expandedNotice?.id,
      commentId,
      attachmentId,
    ]),
  );
  const [commentImagePreviews, setCommentImagePreviews] = useState<
    Record<string, NoticeCommentImagePreview>
  >({});

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    setCommentImagePreviews({});

    if (expandedNoticeId == null || expandedCommentImages.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      expandedCommentImages.map(async ({ commentId, attachmentId }) => ({
        commentId,
        attachmentId,
        blob: await fetchCommonFileBlob(
          'NOTICE_COMMENT',
          commentId,
          attachmentId,
        ),
      })),
    ).then((results) => {
      if (!active) return;

      const previews: Record<string, NoticeCommentImagePreview> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { commentId, attachmentId, blob } = result.value;
          const previewUrl = URL.createObjectURL(blob);
          objectUrls.push(previewUrl);
          previews[
            getNoticeCommentImageKey(expandedNoticeId, commentId, attachmentId)
          ] = { previewUrl };
          return;
        }

        const attachment = expandedCommentImages[index];
        if (!attachment) return;
        previews[
          getNoticeCommentImageKey(
            expandedNoticeId,
            attachment.commentId,
            attachment.attachmentId,
          )
        ] = {
          previewError: '이미지 미리보기를 불러오지 못했습니다.',
        };
      });
      setCommentImagePreviews(previews);
    });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [commentImageRequestKey, expandedNoticeId]);

  useEffect(() => {
    if (
      expandedNoticeId == null ||
      !expandedBodySourceHtml ||
      typeof DOMParser === 'undefined'
    ) {
      setHydratedNoticeBody(null);
      return;
    }

    const document = new DOMParser().parseFromString(
      expandedBodySourceHtml,
      'text/html',
    );
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        'img[data-notice-embedded-image-source]',
      ),
    );
    const imageRecords = images.flatMap((image, index) => {
      const source = image.getAttribute('data-notice-embedded-image-source');
      if (!source) return [];
      const layout = getDeclaredNoticeImageLayout(image);
      const placeholder = layout
        ? createNoticeImageSkeleton(document, expandedNoticeId, index, layout)
        : null;
      const marker = document.createComment(
        `notice-image-${expandedNoticeId}-${index}`,
      );
      if (placeholder) {
        image.replaceWith(placeholder);
      } else {
        image.replaceWith(marker);
      }
      return [
        {
          image,
          index,
          source,
          placeholder,
          marker: placeholder ? null : marker,
        },
      ];
    });
    if (imageRecords.length === 0) {
      setHydratedNoticeBody(null);
      return;
    }

    let active = true;
    let hasImageLoadError = false;
    const objectUrls = new Set<string>();
    const updateHydratedBody = () => {
      if (active) {
        setHydratedNoticeBody({
          noticeId: expandedNoticeId,
          sourceHtml: expandedBodySourceHtml,
          html: document.body.innerHTML,
          hasImageLoadError,
        });
      }
    };
    updateHydratedBody();

    const imageRecordsBySource = new Map<string, typeof imageRecords>();
    imageRecords.forEach((record) => {
      const records = imageRecordsBySource.get(record.source) ?? [];
      records.push(record);
      imageRecordsBySource.set(record.source, records);
    });

    const hydrateImages = async (
      source: string,
      records: typeof imageRecords,
    ) => {
      let objectUrl: string | undefined;
      try {
        const blob = await apiGetBlob(source);
        const resolvedObjectUrl = URL.createObjectURL(blob);
        objectUrl = resolvedObjectUrl;
        if (!active) {
          URL.revokeObjectURL(resolvedObjectUrl);
          return;
        }
        objectUrls.add(resolvedObjectUrl);
        const dimensions = await decodeNoticeImage(resolvedObjectUrl);
        if (!active) return;

        const recordsWithoutPlaceholder = records.filter(
          (record) => !record.placeholder,
        );
        recordsWithoutPlaceholder.forEach((record) => {
          const skeleton = createNoticeImageSkeleton(
            document,
            expandedNoticeId,
            record.index,
            {
              width: `${dimensions.width}px`,
              aspectRatio: `${dimensions.width} / ${dimensions.height}`,
            },
          );
          record.marker?.replaceWith(skeleton);
          record.placeholder = skeleton;
          record.marker = null;
        });
        if (recordsWithoutPlaceholder.length > 0) {
          updateHydratedBody();
          await waitForRenderedFrame();
          if (!active) return;
        }

        records.forEach((record) => {
          const { image } = record;
          const hasDeclaredWidth =
            Boolean(image.style.width) || image.hasAttribute('width');
          image.setAttribute('src', resolvedObjectUrl);
          image.removeAttribute('data-notice-embedded-image-source');
          if (!hasDeclaredWidth) {
            image.setAttribute('width', String(dimensions.width));
          }
          if (!image.hasAttribute('height')) {
            image.setAttribute('height', String(dimensions.height));
          }
          image.style.maxWidth = '100%';
          image.style.height = 'auto';
          image.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
          record.placeholder?.replaceWith(image);
          record.marker?.remove();
          record.placeholder = null;
          record.marker = null;
        });
        updateHydratedBody();
      } catch {
        if (objectUrl && objectUrls.delete(objectUrl)) {
          URL.revokeObjectURL(objectUrl);
        }
        if (!active) return;
        hasImageLoadError = true;
        records.forEach((record) => {
          record.placeholder?.remove();
          record.marker?.remove();
        });
        updateHydratedBody();
      }
    };

    Array.from(imageRecordsBySource.entries()).forEach(([source, records]) => {
      void hydrateImages(source, records);
    });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      objectUrls.clear();
    };
  }, [expandedNoticeId, expandedBodySourceHtml]);

  useEffect(() => {
    const isServerReset = serverItemRevisionRef.current !== serverItemRevision;
    const changedByNoticeId = new Map<number, boolean>();
    items.forEach((item) => {
      const snapshot = JSON.stringify(item.comments ?? []);
      changedByNoticeId.set(
        item.id,
        serverCommentSnapshots.current[item.id] !== snapshot,
      );
      if (isServerReset) {
        delete previousCommentIdsByNoticeId.current[item.id];
      }
    });

    setLocalCommentsByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (changedByNoticeId.get(item.id)) {
          if (isServerReset || !current[item.id]) {
            next[item.id] = item.comments ?? [];
          } else {
            const previousComments = current[item.id];
            const preservedPreviousComments = previousComments.filter(
              (comment) =>
                previousCommentIdsByNoticeId.current[item.id]?.has(
                  String(comment.id),
                ),
            );
            next[item.id] = mergeCommentTrees(
              preservedPreviousComments,
              item.comments ?? [],
              false,
            );
          }
        }
      });
      return next;
    });
    setPreviousCursorByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (
          changedByNoticeId.get(item.id) &&
          (isServerReset || !localCommentsByNoticeId[item.id])
        ) {
          next[item.id] = item.nextBeforeCommentId ?? undefined;
        }
      });
      return next;
    });

    setLoadedPreviousByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (
          changedByNoticeId.get(item.id) &&
          (isServerReset || !localCommentsByNoticeId[item.id])
        ) {
          next[item.id] = false;
        }
      });
      return next;
    });
    setExhaustedPreviousByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (
          changedByNoticeId.get(item.id) &&
          (isServerReset || !localCommentsByNoticeId[item.id])
        ) {
          next[item.id] = false;
        }
      });
      return next;
    });

    items.forEach((item) => {
      serverCommentSnapshots.current[item.id] = JSON.stringify(
        item.comments ?? [],
      );
    });
    serverItemRevisionRef.current = serverItemRevision;
  }, [items, serverItemRevision]);

  const handleLocalCommentAdd = async (
    noticeId: number,
    content: string,
    parentCommentId?: number | string,
    files: File[] = [],
    displayParentCommentId?: number | string,
  ) => {
    if (!content.trim()) {
      return;
    }

    const createdComment = await onAddComment?.(
      noticeId,
      content,
      parentCommentId,
      files,
      displayParentCommentId,
    );
    if (!createdComment) {
      return;
    }

    setLocalCommentsByNoticeId((current) => {
      const comments = current[noticeId] ?? [];
      if (collectCommentIds(comments).has(String(createdComment.id))) {
        return current;
      }
      const nextComments =
        displayParentCommentId != null &&
        String(displayParentCommentId) !== String(parentCommentId)
          ? insertNoticeReplyAfter(
              comments,
              displayParentCommentId,
              createdComment,
            )
          : appendCommentToTree(comments, parentCommentId, createdComment);
      return { ...current, [noticeId]: nextComments };
    });
  };

  const handleLocalCommentEdit = async (
    noticeId: number,
    commentId: number | string,
    content: string,
    files: File[] = [],
  ) => {
    if (!content.trim()) {
      return;
    }

    await onEditComment?.(noticeId, commentId, content, files);
  };

  const handleLocalCommentDelete = async (
    noticeId: number,
    commentId: number | string,
  ) => {
    await onDeleteComment?.(noticeId, commentId);
  };

  return (
    <Box data-testid="notice-feed-list">
      <FeedView
        items={items}
        pagination={pagination}
        renderItem={(item) => {
          const isExpanded = expandedNoticeId === item.id;
          const hasMore = item.body !== item.summary;
          const sanitizedPreviewHtml = prepareNoticeFeedHtml(
            normalizeNoticeEmbeddedImageSources(
              item.bodyHtml ?? item.body,
              item.id,
            ),
          );
          const previewHtml =
            deferNoticeEmbeddedImageSources(sanitizedPreviewHtml);
          const hydratedBody =
            hydratedNoticeBody?.noticeId === item.id &&
            hydratedNoticeBody.sourceHtml === previewHtml
              ? hydratedNoticeBody
              : null;
          const hasRichHtml = /<[^>]+>/.test(previewHtml);
          const embeddedImagePreviews =
            extractNoticeEmbeddedImagePreviews(sanitizedPreviewHtml);
          const collapsedPreviewHtml = removeNoticeEmbeddedImages(previewHtml);
          const itemComments =
            localCommentsByNoticeId[item.id] ?? item.comments ?? [];
          const visibleComments =
            loadedPreviousByNoticeId[item.id] || itemComments.length <= 3
              ? itemComments
              : itemComments.slice(-3);
          const visibleCommentCount = countComments(visibleComments);
          const totalCommentCount = countComments(itemComments);
          const hasMoreCommentsAvailable =
            item.hasPreviousComments === true ||
            item.commentCount > visibleCommentCount ||
            item.nextBeforeCommentId != null;
          const canLoadPrevious =
            !exhaustedPreviousByNoticeId[item.id] &&
            hasMoreCommentsAvailable &&
            (totalCommentCount >= 3 || item.commentCount > visibleCommentCount);
          const attachmentFiles =
            item.attachmentDetails ??
            ((item.attachments ?? []).map((name, index) => ({
              id: `${item.id}-${index}`,
              name,
            })) as Array<{
              id: string;
              name: string;
              size?: number;
              boardFileId?: number | string | null;
              objectKey?: string | null;
              bucketName?: string | null;
            }>);

          return (
            <FeedCard
              key={item.id}
              author={item.meta.split('·')[0].trim()}
              authorProfileImageUrl={item.writerProfileImage}
              meta={item.meta}
              avatar={item.meta.slice(1, 3)}
              actions={
                <>
                  <NoticeLoginPopupBadge loginPopupYn={item.loginPopupYn} popupEndDate={item.popupEndDate} />
                  <IconButton
                    size="small"
                    aria-label={`${item.isPinned === 'Y' ? '상단 고정 해제' : '상단 고정'} ${item.title}`}
                    title={
                      item.isPinned === 'Y' ? '상단 고정 해제' : '상단 고정'
                    }
                    onClick={() => onTogglePinned?.(item)}
                  >
                    <PushPinOutlinedIcon
                      fontSize="small"
                      color={item.isPinned === 'Y' ? 'primary' : 'inherit'}
                    />
                  </IconButton>
                  {item.isPostOwner !== false && (
                    <>
                      <IconButton
                        size="small"
                        aria-label={`공지 메뉴 ${item.title}`}
                        onClick={(event) => {
                          setNoticeMenuId(item.id);
                          setNoticeMenuAnchor(event.currentTarget);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Menu
                        anchorEl={noticeMenuAnchor}
                        open={noticeMenuId === item.id}
                        onClose={() => {
                          setNoticeMenuAnchor(null);
                          setNoticeMenuId(null);
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            setNoticeMenuAnchor(null);
                            setNoticeMenuId(null);
                            onEdit?.(item);
                          }}
                        >
                          수정
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setNoticeMenuAnchor(null);
                            setNoticeMenuId(null);
                            onDelete?.(item.id);
                          }}
                        >
                          삭제
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                </>
              }
              badges={
                <NoticeCategoryBadge
                  label={item.state}
                  code={item.noticeGubunCode}
                  isDark={isDark}
                />
              }
              isDark={isDark}
              testId={`notice-feed-card-${item.id}`}
            >
              <Typography
                variant="h6"
                onClick={() => {
                  if (!hasMore) {
                    void onToggleExpand?.(item.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    !hasMore ||
                    (event.key !== 'Enter' && event.key !== ' ')
                  ) {
                    return;
                  }
                  event.preventDefault();
                  void onToggleExpand?.(item.id);
                }}
                role={!hasMore ? 'button' : undefined}
                tabIndex={!hasMore ? 0 : undefined}
                sx={{
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                  color: 'text.primary',
                  cursor: !hasMore ? 'pointer' : 'default',
                }}
              >
                {item.title}
              </Typography>

              <FeedBodyContent
                hasMore={hasMore}
                isExpanded={isExpanded}
                onToggleExpand={() => onToggleExpand?.(item.id)}
                contentTestId={`notice-preview-${item.id}`}
                imagePreviewTestId={`notice-embedded-image-preview-${item.id}`}
                onContentClick={(event) => {
                  const imageElement = (event.target as HTMLElement).closest(
                    'img',
                  );
                  if (imageElement) {
                    const src = imageElement.getAttribute('src');
                    if (src) {
                      setViewerImage({
                        src,
                        alt: imageElement.getAttribute('alt') || '원본 이미지',
                      });
                    }
                    if (!hasMore) {
                      void onNoticeInteract?.(item.id);
                    }
                    return;
                  }
                  if (!hasMore) {
                    void onToggleExpand?.(item.id);
                  }
                }}
                contentSx={{
                  '& br': { display: 'inline' },
                  '& img': { cursor: 'pointer' },
                  '& [data-notice-expanded-image-skeleton="true"]': {
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    borderRadius: 1,
                    backgroundColor: isDark
                      ? 'rgba(51,65,85,0.7)'
                      : 'rgba(226,232,240,0.9)',
                    backgroundImage: isDark
                      ? 'linear-gradient(90deg, transparent, rgba(148,163,184,0.14), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                    backgroundSize: '200% 100%',
                    animation:
                      'notice-expanded-image-wave 1.5s ease-in-out infinite',
                  },
                  '@keyframes notice-expanded-image-wave': {
                    '0%': { backgroundPosition: '100% 0' },
                    '100%': { backgroundPosition: '-100% 0' },
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    '& [data-notice-expanded-image-skeleton="true"]': {
                      animation: 'none',
                    },
                  },
                }}
                richText={
                  hasRichHtml
                    ? {
                        collapsedHtml: collapsedPreviewHtml,
                        expandedHtml:
                          hydratedBody?.html ??
                          expandedBodyLoadingHtml ??
                          previewHtml,
                        images: embeddedImagePreviews,
                        imageError:
                          isExpanded && hydratedBody?.hasImageLoadError
                            ? '본문 이미지를 불러오지 못했습니다.'
                            : undefined,
                        onOpenImage: setViewerImage,
                        renderImagePreview: (image, index, openImage) => {
                          const imageKey = `${image.src}-${index}`;
                          const isLoaded = loadedImageKeys.has(imageKey);
                          return (
                            <Box
                              component="button"
                              type="button"
                              aria-label={`본문 이미지 미리보기 ${index + 1}: ${image.alt}`}
                              onClick={(event) => {
                                const imageElement =
                                  event.currentTarget.querySelector('img');
                                if (isLoaded && imageElement) {
                                  openImage({
                                    src: imageElement.src,
                                    alt: image.alt,
                                  });
                                }
                                if (!hasMore) {
                                  void onNoticeInteract?.(item.id);
                                }
                              }}
                              sx={{
                                position: 'relative',
                                display: 'block',
                                width: NOTICE_IMAGE_PREVIEW_WIDTH,
                                height: NOTICE_IMAGE_PREVIEW_HEIGHT,
                                p: 0,
                                border: 0,
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                                cursor: isLoaded ? 'pointer' : 'default',
                              }}
                            >
                              {!isLoaded && (
                                <Skeleton
                                  variant="rounded"
                                  animation="wave"
                                  data-testid={`notice-embedded-image-skeleton-${item.id}-${index}`}
                                  sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: NOTICE_IMAGE_PREVIEW_WIDTH,
                                    height: NOTICE_IMAGE_PREVIEW_HEIGHT,
                                    borderRadius: 1,
                                    bgcolor: isDark
                                      ? 'rgba(51,65,85,0.7)'
                                      : 'rgba(226,232,240,0.9)',
                                  }}
                                />
                              )}
                              <AuthenticatedNoticeImage
                                src={image.src}
                                alt={image.alt}
                                onLoad={() =>
                                  setLoadedImageKeys((current) => {
                                    const next = new Set(current);
                                    next.add(imageKey);
                                    return next;
                                  })
                                }
                                sx={{
                                  width: NOTICE_IMAGE_PREVIEW_WIDTH,
                                  height: NOTICE_IMAGE_PREVIEW_HEIGHT,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: isDark
                                    ? 'rgba(148,163,184,0.24)'
                                    : 'rgba(148,163,184,0.3)',
                                  bgcolor: isDark
                                    ? 'rgba(15,23,42,0.7)'
                                    : '#f8fafc',
                                  cursor: isLoaded ? 'pointer' : 'default',
                                  opacity: isLoaded ? 1 : 0,
                                  display: 'block',
                                }}
                              />
                            </Box>
                          );
                        },
                      }
                    : undefined
                }
                text={{
                  collapsed: item.summary,
                  expanded: item.body,
                }}
              />

              {attachmentFiles.length > 0 && (
                <Box
                  onClick={() => {
                    if (!hasMore) {
                      void onNoticeInteract?.(item.id);
                    }
                  }}
                >
                  {/* <Divider sx={{ my: 1.5 }} /> */}
                  <AttachmentList
                    files={attachmentFiles.map((attachment) => ({
                      id: String(attachment.id),
                      name: attachment.name,
                      size: attachment.size,
                    }))}
                    isDark={isDark}
                    showActions
                    onDownload={(attachmentId) => {
                      const match = attachmentFiles.find(
                        (attachment) => String(attachment.id) === attachmentId,
                      );

                      if (!match) {
                        return;
                      }

                      onDownload?.(item.id, {
                        ...match,
                        name: match.name,
                      });
                    }}
                  />
                </Box>
              )}

              {attachmentFiles.length > 0 && <Divider sx={{ my: 1.5 }} />}
              <FeedReactionBar
                liked={Boolean(item.liked)}
                likeCount={item.likeCount ?? 0}
                bookmarked={Boolean(item.bookmarked)}
                commentCount={item.commentCount}
                onToggleLike={() => onToggleLike?.(item.id)}
                onToggleBookmark={() => onToggleBookmark?.(item.id)}
                isDark={isDark}
              />

              <FeedCommentsSection
                showPrevious={canLoadPrevious}
                isLoadingPrevious={Boolean(loadingPreviousByNoticeId[item.id])}
                remainingPreviousCount={
                  Number.isFinite(item.commentCount)
                    ? Math.max(
                        0,
                        item.commentCount - countLoadedComments(itemComments),
                      )
                    : undefined
                }
                onLoadPrevious={async () => {
                  if (loadingPreviousByNoticeId[item.id]) return;
                  const cursor =
                    previousCursorByNoticeId[item.id] ?? visibleComments[0]?.id;
                  if (!cursor || !onLoadPreviousComments) return;

                  setLoadingPreviousByNoticeId((current) => ({
                    ...current,
                    [item.id]: true,
                  }));
                  try {
                    const previousResult = await onLoadPreviousComments(
                      item.id,
                      cursor,
                    );
                    const previous = previousResult.comments;
                    const currentComments =
                      localCommentsByNoticeId[item.id] ?? itemComments;
                    const merged = mergeCommentTrees(currentComments, previous);
                    const nextCursor = previousResult.nextBeforeCommentId;
                    const hasNewComments =
                      countComments(merged) > countComments(currentComments);
                    const previousIds = collectCommentIds(previous);
                    previousCommentIdsByNoticeId.current[item.id] = new Set([
                      ...(previousCommentIdsByNoticeId.current[item.id] ?? []),
                      ...previousIds,
                    ]);
                    setLocalCommentsByNoticeId((current) => ({
                      ...current,
                      [item.id]: merged,
                    }));
                    setPreviousCursorByNoticeId((cursors) => ({
                      ...cursors,
                      [item.id]: nextCursor ?? undefined,
                    }));
                    setLoadedPreviousByNoticeId((loaded) => ({
                      ...loaded,
                      [item.id]: true,
                    }));
                    if (
                      !previousResult.hasPrevious ||
                      !hasNewComments ||
                      nextCursor == null ||
                      String(nextCursor) === String(cursor)
                    ) {
                      setExhaustedPreviousByNoticeId((exhausted) => ({
                        ...exhausted,
                        [item.id]: true,
                      }));
                    }
                  } catch (error) {
                    onLoadPreviousCommentsError?.(error);
                  } finally {
                    setLoadingPreviousByNoticeId((current) => ({
                      ...current,
                      [item.id]: false,
                    }));
                  }
                }}
              >
                <Box
                  onClick={() => {
                    if (!hasMore) {
                      void onNoticeInteract?.(item.id);
                    }
                  }}
                >
                  <CommentThread
                    comments={normalizeCommentTree(
                      visibleComments,
                      item.id,
                      commentImagePreviews,
                    )}
                    expandReplies={Boolean(loadedPreviousByNoticeId[item.id])}
                    onSubmitComment={async (content, files) => {
                      await handleLocalCommentAdd(
                        item.id,
                        content,
                        undefined,
                        files,
                      );
                    }}
                    onSubmitReply={async (
                      commentId,
                      content,
                      files,
                      parentCommentId,
                    ) => {
                      await handleLocalCommentAdd(
                        item.id,
                        content,
                        parentCommentId,
                        files,
                        commentId,
                      );
                    }}
                    onEditComment={async (commentId, content, files) => {
                      await handleLocalCommentEdit(
                        item.id,
                        commentId,
                        content,
                        files,
                      );
                    }}
                    onDeleteComment={async (commentId) => {
                      await handleLocalCommentDelete(item.id, commentId);
                    }}
                    onDownloadAttachment={(commentId, attachmentId, fileName) =>
                      onDownloadCommentAttachment?.(
                        commentId,
                        attachmentId,
                        fileName,
                      )
                    }
                    onDeleteAttachment={(commentId, attachmentId) =>
                      onDeleteCommentAttachment?.(
                        item.id,
                        commentId,
                        attachmentId,
                      )
                    }
                    onOpenAttachmentImage={setViewerImage}
                    isDark={isDark}
                    showComposer
                    placeholder="줄바꿈 Shift+Enter, 입력 Enter"
                    composerLabel="댓글 입력"
                    submitLabel="등록"
                  />
                </Box>
              </FeedCommentsSection>
            </FeedCard>
          );
        }}
      />

      <ImageViewerDialog
        open={Boolean(viewerImage)}
        src={viewerImage?.src ?? ''}
        alt={viewerImage?.alt ?? '원본 이미지'}
        onClose={() => setViewerImage(null)}
      />
    </Box>
  );
}
