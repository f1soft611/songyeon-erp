import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { FeedBodyContent } from '../../../../../shared/components/feed/FeedBodyContent';
import type { FeedBodyImage } from '../../../../../shared/components/feed/FeedBodyContent';
import { FeedCommentsSection } from '../../../../../shared/components/feed/FeedCommentsSection';
import { FeedReactionBar } from '../../../../../shared/components/feed/FeedReactionBar';
import { FeedCard } from '../../../../../shared/components/feed/FeedCard';
import { ProfileAvatar } from '../../../../../shared/components/ProfileAvatar';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { ImageViewerDialog } from '../../../../../shared/components/ImageViewerDialog';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { getStoredAuth } from '../../../../../shared/services/authService';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  createApprovalComment,
  cancelDocumentApproval,
  cancelDocumentSubmission,
  deleteDocumentApproval,
  deleteApprovalComment,
  deleteApprovalCommentAttachment,
  downloadApprovalCommentAttachment,
  downloadDocumentApprovalAttachment,
  fetchApprovalCommentAttachmentBlob,
  getDocumentApprovalDetail,
  listApprovalComments,
  processDocumentApprovalAction,
  updateApprovalComment,
  uploadApprovalCommentAttachment,
} from '../services/documentApproval.service';
import {
  formatApprovalSystemEventContent,
  getApprovalStatusPresentation,
  getApprovalSystemEventPresentation,
  getDocumentKindPresentation,
} from '../data/documentPresentation';
import { getDocumentDisplayDate } from '../data/documentDate';
import { ApprovalSequenceBadge } from './ApprovalSequenceBadge';
import { DocumentApprovalToolbar } from './DocumentApprovalToolbar';
import { useDocumentApprovalBody } from '../hooks/useDocumentApprovalBody';
import type { DocumentFeedWriteItem } from '../types/documentWrite.types';
import type {
  DocumentApprovalActionRequest,
  DocumentApprovalComment,
  DocumentApprovalDetail,
  DocumentApprovalLine,
  DocumentApprovalSystemEvent,
} from '../types/documentWrite.types';

type DocumentApprovalDetailFeedSharedProps = {
  open: boolean;
  electronicApprovalId: number | null;
  onActionComplete: () => void;
  onEditDocument: (detail: DocumentApprovalDetail) => void;
  onTogglePin?: (
    electronicApprovalId: number,
    pinned: boolean,
    title: string,
  ) => void;
  isPinned?: boolean;
  pinPending?: boolean;
  detailRefreshToken: number;
};

type DocumentApprovalDetailFeedProps =
  | (DocumentApprovalDetailFeedSharedProps & {
      presentation: 'feed';
      feedItem: DocumentFeedWriteItem;
      employeeId: string;
    })
  | (DocumentApprovalDetailFeedSharedProps & {
      presentation?: 'panel';
      onClose: () => void;
    });

function formatApprovalDate(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10).replaceAll('-', '.');
}

function formatCommentTime(value?: string | null): string {
  if (!value) return '방금';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPlainText(html: string): string {
  return (
    new DOMParser()
      .parseFromString(html, 'text/html')
      .body.textContent?.trim() ?? ''
  );
}

function approvalLineStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING: '대기',
    PENDING: '처리 중',
    APPROVED: '승인',
    REJECTED: '반려',
    RETURNED: '보완요청',
  };
  return labels[status] ?? status;
}

function approvalLineStatusDisplayLabel(status: string): string {
  return status === 'PENDING' ? '진행' : approvalLineStatusLabel(status);
}

type ApprovalLineStatusTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'error'
  | 'warning';

const approvalLineStatusTones: Record<string, ApprovalLineStatusTone> = {
  WAITING: 'neutral',
  PENDING: 'primary',
  APPROVED: 'success',
  REJECTED: 'error',
  RETURNED: 'warning',
};

const approvalLineStatusColors: Record<ApprovalLineStatusTone, string> = {
  neutral: 'text.disabled',
  primary: 'primary.main',
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.dark',
};

const approvalLineStatusBorderColors: Record<ApprovalLineStatusTone, string> = {
  neutral: 'divider',
  primary: 'info.main',
  success: 'success.light',
  error: 'error.light',
  warning: 'warning.light',
};

const approvalBadgeBorderRadius = '8px';
const completedApprovalStatuses = new Set(['APPROVED', 'REJECTED', 'RETURNED']);
type ReasonAction = Extract<
  DocumentApprovalActionRequest['action'],
  'REJECTED' | 'RETURNED'
>;

function toApprovalCommentTree(
  records: DocumentApprovalComment[],
  systemEvents: DocumentApprovalSystemEvent[],
  commentImageUrls: Record<string, string>,
  commentImageErrors: Record<string, string>,
): FeedCommentItem[] {
  const comments = new Map<string, FeedCommentItem>();
  const createdAtById = new Map<string, string | null | undefined>();
  const sortIdById = new Map<string, number>();
  const roots: FeedCommentItem[] = [];
  records.forEach((record) => {
    const commentKey = String(record.commentId);
    createdAtById.set(commentKey, record.createdAt);
    sortIdById.set(commentKey, record.commentId);
    comments.set(commentKey, {
      id: record.commentId,
      author: record.deletedYn === 'Y' ? '삭제된 댓글' : record.writerName,
      authorProfileImageUrl:
        record.deletedYn === 'Y' ? null : record.writerProfileImage,
      time: formatCommentTime(record.createdAt),
      content:
        record.deletedYn === 'Y' ? '[삭제된 댓글입니다.]' : record.content,
      isDeleted: record.deletedYn === 'Y',
      isEditable:
        record.deletedYn !== 'Y' && record.writerId === getStoredAuth()?.userId,
      attachments: (record.attachments ?? []).map((file) => ({
        id: String(file.fileId),
        name: file.fileName ?? '첨부파일',
        size: file.fileSize,
        mimeType: file.mimeType,
        previewUrl: commentImageUrls[`${record.commentId}:${file.fileId}`],
        previewError: commentImageErrors[`${record.commentId}:${file.fileId}`],
      })),
      replies: [],
    });
  });
  records.forEach((record) => {
    const item = comments.get(String(record.commentId));
    if (!item) return;
    const parent =
      record.parentCommentId == null
        ? undefined
        : comments.get(String(record.parentCommentId));
    if (parent) {
      parent.replies = [...(parent.replies ?? []), item];
    } else {
      roots.push(item);
    }
  });
  systemEvents.forEach((event, index) => {
    const eventId =
      event.commentId ??
      `system-${event.eventType}-${event.createdAt ?? index}`;
    const eventKey = String(eventId);
    createdAtById.set(eventKey, event.createdAt);
    if (typeof event.commentId === 'number') {
      sortIdById.set(eventKey, event.commentId);
    }
    roots.push({
      id: eventId,
      author: event.writerName || '시스템',
      authorProfileImageUrl: event.writerProfileImage,
      time: formatCommentTime(event.createdAt),
      content: formatApprovalSystemEventContent(event.eventType, event.content),
      isSystemEvent: true,
      systemEventBadge: getApprovalSystemEventPresentation(event.eventType),
    });
  });
  roots.sort((left, right) => {
    const leftTime = new Date(
      createdAtById.get(String(left.id)) ?? '',
    ).getTime();
    const rightTime = new Date(
      createdAtById.get(String(right.id)) ?? '',
    ).getTime();
    if (
      !Number.isNaN(leftTime) &&
      !Number.isNaN(rightTime) &&
      leftTime !== rightTime
    ) {
      return leftTime - rightTime;
    }
    if (Number.isNaN(leftTime) !== Number.isNaN(rightTime)) {
      return Number.isNaN(leftTime) ? -1 : 1;
    }
    const leftId = sortIdById.get(String(left.id));
    const rightId = sortIdById.get(String(right.id));
    if (leftId !== undefined && rightId !== undefined && leftId !== rightId) {
      return leftId - rightId;
    }
    return 0;
  });
  return roots;
}

export function DocumentApprovalDetailFeed(
  props: DocumentApprovalDetailFeedProps,
) {
  const {
    open,
    electronicApprovalId,
    onActionComplete,
    onEditDocument,
    onTogglePin,
    pinPending = false,
    detailRefreshToken,
  } = props;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isFeedPresentation = props.presentation === 'feed';
  const feedEmployeeId = props.presentation === 'feed' ? props.employeeId : '';
  const onClose = isFeedPresentation ? undefined : props.onClose;
  const { showSuccess, showError } = useNotification();
  const preloadedFeedData =
    props.presentation === 'feed' ? props.feedItem.feedData : null;
  const [detail, setDetail] = useState<DocumentApprovalDetail | null>(
    preloadedFeedData,
  );
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [selectedBodyImage, setSelectedBodyImage] =
    useState<FeedBodyImage | null>(null);
  const [panelEmployeeId, setPanelEmployeeId] = useState('');
  const employeeId = isFeedPresentation ? feedEmployeeId : panelEmployeeId;
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null);
  const [commentRecords, setCommentRecords] = useState<
    DocumentApprovalComment[]
  >(preloadedFeedData?.comments ?? []);
  const [commentSystemEvents, setCommentSystemEvents] = useState<
    DocumentApprovalDetail['systemEvents']
  >(preloadedFeedData?.systemEvents ?? []);
  const [commentCount, setCommentCount] = useState(
    preloadedFeedData?.commentCount ?? 0,
  );
  const [hasPreviousComments, setHasPreviousComments] = useState(
    preloadedFeedData?.hasPreviousComments ?? false,
  );
  const [nextBeforeCommentId, setNextBeforeCommentId] = useState<number | null>(
    preloadedFeedData?.nextBeforeCommentId ?? null,
  );
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentRetryRequest, setCommentRetryRequest] = useState<{
    beforeCommentId?: number;
    append: boolean;
  } | null>(null);
  const [commentImageUrls, setCommentImageUrls] = useState<
    Record<string, string>
  >({});
  const [commentImageErrors, setCommentImageErrors] = useState<
    Record<string, string>
  >({});
  const [reasonPopover, setReasonPopover] = useState<{
    anchorEl: HTMLElement;
    reason: string;
    title: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelDialogType, setCancelDialogType] = useState<
    'submission' | 'approval' | null
  >(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [detailRetryToken, setDetailRetryToken] = useState(0);
  const previousDetailRefreshToken = useRef(detailRefreshToken);
  const {
    bodyHtml,
    bodyImages,
    bodyImageError,
    expandedBodyHtml,
    collapsedBodyHtml,
  } = useDocumentApprovalBody(electronicApprovalId, detail?.contentsHtml ?? '');
  const displayDate = detail
    ? formatApprovalDate(getDocumentDisplayDate(detail).value)
    : '';

  const loadComments = useCallback(
    async (beforeCommentId?: number, append = false) => {
      if (electronicApprovalId === null) return;
      setIsLoadingComments(true);
      setCommentError('');
      setCommentRetryRequest(null);
      try {
        const page = await listApprovalComments(electronicApprovalId, {
          limit: append ? 20 : 3,
          beforeCommentId,
        });
        setCommentRecords((current) =>
          append ? [...page.comments, ...current] : page.comments,
        );
        setCommentSystemEvents((current) =>
          append ? [...page.systemEvents, ...current] : page.systemEvents,
        );
        setCommentCount(page.resultCnt);
        setHasPreviousComments(page.hasPrevious);
        setNextBeforeCommentId(page.nextBeforeCommentId);
      } catch (error: unknown) {
        setCommentRetryRequest({ beforeCommentId, append });
        setCommentError(
          error instanceof Error
            ? error.message
            : '댓글을 불러오지 못했습니다.',
        );
      } finally {
        setIsLoadingComments(false);
      }
    },
    [electronicApprovalId],
  );

  useEffect(() => {
    if (
      !isFeedPresentation ||
      !preloadedFeedData ||
      !open ||
      electronicApprovalId === null
    ) {
      return;
    }
    setDetail(preloadedFeedData);
    setCommentRecords(preloadedFeedData.comments);
    setCommentSystemEvents(preloadedFeedData.systemEvents);
    setCommentCount(preloadedFeedData.commentCount);
    setHasPreviousComments(preloadedFeedData.hasPreviousComments);
    setNextBeforeCommentId(preloadedFeedData.nextBeforeCommentId);
    setLoadError('');
    setCommentError('');
    setIsLoading(false);
  }, [electronicApprovalId, isFeedPresentation, open, preloadedFeedData]);

  useEffect(() => {
    if (!open || electronicApprovalId === null || isFeedPresentation) return;
    let active = true;
    setIsLoading(true);
    setLoadError('');
    setActionError('');
    setActionComment('');
    setDetail(null);
    setIsLiked(false);
    setIsBookmarked(false);
    setIsBodyExpanded(true);
    setSelectedBodyImage(null);
    setPanelEmployeeId('');
    void Promise.all([
      getDocumentApprovalDetail(electronicApprovalId),
      fetchMyProfile(),
    ])
      .then(([nextDetail, profile]) => {
        if (!active) return;
        setDetail(nextDetail);
        if (!profile) {
          setLoadError('로그인 사용자의 사원 정보를 확인할 수 없습니다.');
          return;
        }
        const nextEmployeeId = String(profile.employeeId ?? '').trim();
        if (!nextEmployeeId) {
          setLoadError('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
          return;
        }
        setPanelEmployeeId(nextEmployeeId);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : '전자결재 상세 정보를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detailRetryToken, electronicApprovalId, isFeedPresentation, open]);

  useEffect(() => {
    if (previousDetailRefreshToken.current === detailRefreshToken) return;
    previousDetailRefreshToken.current = detailRefreshToken;
    if (!open || electronicApprovalId === null || isFeedPresentation) return;

    let active = true;
    setLoadError('');
    void getDocumentApprovalDetail(electronicApprovalId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : '전자결재 상세 정보를 불러오지 못했습니다.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [detailRefreshToken, electronicApprovalId, isFeedPresentation, open]);

  useEffect(() => {
    if (!open || electronicApprovalId === null || isFeedPresentation) return;
    setCommentRecords([]);
    setCommentSystemEvents([]);
    setCommentCount(0);
    setHasPreviousComments(false);
    setNextBeforeCommentId(null);
    setCommentRetryRequest(null);
    void loadComments();
  }, [electronicApprovalId, isFeedPresentation, loadComments, open]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const imageAttachments = commentRecords.flatMap((comment) =>
      (comment.attachments ?? [])
        .filter((file) => file.mimeType?.startsWith('image/'))
        .map((file) => ({ commentId: comment.commentId, file })),
    );
    setCommentImageUrls({});
    setCommentImageErrors({});
    if (electronicApprovalId === null || imageAttachments.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      imageAttachments.map(async ({ commentId, file }) => ({
        key: `${commentId}:${file.fileId}`,
        blob: await fetchApprovalCommentAttachmentBlob(
          electronicApprovalId,
          commentId,
          file.fileId,
        ),
      })),
    ).then((results) => {
      if (!active) return;
      const urls: Record<string, string> = {};
      const errors: Record<string, string> = {};
      results.forEach((result, index) => {
        const attachment = imageAttachments[index];
        if (!attachment) return;
        const key = `${attachment.commentId}:${attachment.file.fileId}`;
        if (result.status === 'fulfilled') {
          const url = URL.createObjectURL(result.value.blob);
          objectUrls.push(url);
          urls[key] = url;
          return;
        }
        errors[key] = '이미지 미리보기를 불러오지 못했습니다.';
      });
      setCommentImageUrls(urls);
      setCommentImageErrors(errors);
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commentRecords, electronicApprovalId]);

  const canProcess = useMemo(
    () =>
      Boolean(
        detail?.approvalLines.some(
          (line) =>
            line.participantUserId === employeeId &&
            line.actionStatus === 'PENDING' &&
            line.participantType !== 'REFERENCE',
        ),
      ),
    [detail, employeeId],
  );
  const canCancelSubmission = Boolean(
    detail?.isDrafter && detail.documentStatus === 'PENDING',
  );
  const canCancelApproval = useMemo(() => {
    if (
      !detail ||
      (detail.documentStatus !== 'PENDING' &&
        detail.documentStatus !== 'IN_PROGRESS')
    ) {
      return false;
    }
    const ownApprovedLine = detail.approvalLines.find(
      (line) =>
        line.participantUserId === employeeId &&
        line.stageOrder > 1 &&
        (line.participantType === 'APPROVAL' ||
          line.participantType === 'AGREEMENT') &&
        line.actionStatus === 'APPROVED',
    );
    return Boolean(
      ownApprovedLine &&
      !detail.approvalLines.some(
        (line) =>
          line.stageOrder > ownApprovedLine.stageOrder &&
          (line.participantType === 'APPROVAL' ||
            line.participantType === 'AGREEMENT') &&
          completedApprovalStatuses.has(line.actionStatus),
      ),
    );
  }, [detail, employeeId]);
  const approvalLineGroups = useMemo(() => {
    const orderedLines = [...(detail?.approvalLines ?? [])].sort(
      (left, right) =>
        left.stageOrder - right.stageOrder ||
        left.participantOrder - right.participantOrder,
    );
    return {
      approval: orderedLines.filter(
        (line) => line.participantType === 'APPROVAL',
      ),
      agreement: orderedLines.filter(
        (line) => line.participantType === 'AGREEMENT',
      ),
      reference: orderedLines.filter(
        (line) => line.participantType === 'REFERENCE',
      ),
    };
  }, [detail?.approvalLines]);
  const agreementStages = useMemo(() => {
    const stages = new Map<number, DocumentApprovalLine[]>();
    for (const line of approvalLineGroups.agreement) {
      const participants = stages.get(line.stageOrder) ?? [];
      participants.push(line);
      stages.set(line.stageOrder, participants);
    }
    return Array.from(stages, ([stageOrder, participants]) => ({
      stageOrder,
      participants,
    }));
  }, [approvalLineGroups.agreement]);
  const hasMoreBody = Boolean(
    bodyHtml &&
    (getPlainText(bodyHtml) !== (detail?.summary ?? '').trim() ||
      bodyImages.length > 0 ||
      bodyHtml.includes('data-approval-embedded-image-file-id')),
  );
  const shouldShowApprovalLine = !hasMoreBody || isBodyExpanded;

  const handleDeleteDocument = async () => {
    if (electronicApprovalId === null || isDeleting) return;
    setIsDeleting(true);
    setActionError('');
    try {
      await deleteDocumentApproval(electronicApprovalId);
      showSuccess('문서가 삭제되었습니다.');
      setIsDeleteDialogOpen(false);
      onActionComplete();
      onClose?.();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : '문서 삭제에 실패했습니다.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAction = async (
    action: DocumentApprovalActionRequest['action'],
  ) => {
    if (electronicApprovalId === null || isActing) return;
    const comment = actionComment.trim();
    if ((action === 'REJECTED' || action === 'RETURNED') && !comment) {
      setActionError('반려 또는 보완요청 사유를 입력해 주세요.');
      return;
    }
    setIsActing(true);
    setActionError('');
    try {
      await processDocumentApprovalAction(electronicApprovalId, {
        action,
        actionComment: comment || undefined,
      });
      showSuccess(
        action === 'APPROVED'
          ? '문서가 승인되었습니다.'
          : action === 'REJECTED'
            ? '문서가 반려되었습니다.'
            : '문서 보완을 요청했습니다.',
      );
      if (action !== 'APPROVED') {
        setReasonAction(null);
        setActionComment('');
      }
      onActionComplete();
      setDetailRetryToken((token) => token + 1);
      await loadComments();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : '결재 처리에 실패했습니다.',
      );
    } finally {
      setIsActing(false);
    }
  };

  const openReasonDialog = (action: ReasonAction) => {
    setActionError('');
    setActionComment('');
    setReasonAction(action);
  };

  const closeReasonDialog = () => {
    if (isActing) return;
    setReasonAction(null);
    setActionComment('');
    setActionError('');
  };

  const handleCancelDocumentAction = async () => {
    if (electronicApprovalId === null || !cancelDialogType || isActing) return;
    const cancelType = cancelDialogType;
    setIsActing(true);
    setActionError('');
    try {
      if (cancelType === 'submission') {
        await cancelDocumentSubmission(electronicApprovalId);
        showSuccess('결재신청이 취소되었습니다.');
      } else {
        await cancelDocumentApproval(electronicApprovalId);
        showSuccess('승인이 취소되었습니다.');
      }
      setCancelDialogType(null);
      onActionComplete();
      setDetailRetryToken((token) => token + 1);
      await loadComments();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : '결재 취소에 실패했습니다.',
      );
    } finally {
      setIsActing(false);
    }
  };

  const uploadCommentFiles = async (
    approvalId: number,
    commentId: number,
    files: File[],
  ): Promise<DocumentApprovalComment['attachments']> => {
    const uploaded: NonNullable<DocumentApprovalComment['attachments']> = [];
    try {
      for (const file of files) {
        uploaded.push(
          await uploadApprovalCommentAttachment(approvalId, commentId, file),
        );
      }
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        uploaded.map((file) =>
          deleteApprovalCommentAttachment(approvalId, commentId, file.fileId),
        ),
      );
      if (cleanupResults.some((result) => result.status === 'rejected')) {
        showError('일부 댓글 첨부파일 정리에 실패했습니다.');
      }
      throw error;
    }
    return uploaded;
  };

  const handleAddComment = async (
    content: string,
    files: File[],
    parentCommentId?: number | string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      const created = await createApprovalComment(
        electronicApprovalId,
        content,
        parentCommentId == null ? undefined : Number(parentCommentId),
      );
      const createdWithAttachments = {
        ...created,
        attachments: [...(created.attachments ?? [])],
      };
      setCommentRecords((current) =>
        current.some((record) => record.commentId === created.commentId)
          ? current
          : [...current, createdWithAttachments],
      );
      if (parentCommentId == null) {
        setCommentCount((current) => current + 1);
      }
      const uploadedAttachments = await uploadCommentFiles(
        electronicApprovalId,
        created.commentId,
        files,
      );
      if (uploadedAttachments?.length) {
        setCommentRecords((current) =>
          current.map((record) =>
            record.commentId === created.commentId
              ? {
                  ...record,
                  attachments: [
                    ...(record.attachments ?? []),
                    ...uploadedAttachments,
                  ],
                }
              : record,
          ),
        );
      }
      showSuccess(
        parentCommentId == null
          ? '댓글이 등록되었습니다.'
          : '답글이 등록되었습니다.',
      );
    } catch (error) {
      showError(
        error instanceof Error ? error.message : '댓글 저장에 실패했습니다.',
      );
      throw error;
    }
  };

  const handleUpdateComment = async (
    commentId: string | number,
    content: string,
    files: File[],
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await updateApprovalComment(
        electronicApprovalId,
        Number(commentId),
        content,
      );
      await uploadCommentFiles(electronicApprovalId, Number(commentId), files);
      showSuccess('댓글이 수정되었습니다.');
      await loadComments();
    } catch (error) {
      await loadComments();
      showError(
        error instanceof Error ? error.message : '댓글 수정에 실패했습니다.',
      );
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (electronicApprovalId === null) return;
    try {
      await deleteApprovalComment(electronicApprovalId, commentId);
      showSuccess('댓글이 삭제되었습니다.');
      await loadComments();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.',
      );
    }
  };

  const handleLoadPreviousComments = async () => {
    if (nextBeforeCommentId === null) return;
    await loadComments(nextBeforeCommentId, true);
  };

  const handleRetryComments = () => {
    if (commentRetryRequest) {
      void loadComments(
        commentRetryRequest.beforeCommentId,
        commentRetryRequest.append,
      );
      return;
    }
    void loadComments();
  };

  const handleDownloadCommentAttachment = async (
    commentId: string | number,
    attachmentId: string,
    fileName?: string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await downloadApprovalCommentAttachment(
        electronicApprovalId,
        commentId,
        attachmentId,
        fileName,
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : '댓글 첨부파일을 내려받지 못했습니다.',
      );
    }
  };

  const handleDeleteCommentAttachment = async (
    commentId: string | number,
    attachmentId: string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await deleteApprovalCommentAttachment(
        electronicApprovalId,
        commentId,
        attachmentId,
      );
      showSuccess('댓글 첨부파일이 삭제되었습니다.');
      await loadComments();
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : '댓글 첨부파일을 삭제하지 못했습니다.',
      );
      throw error;
    }
  };

  const handleDownloadDocumentAttachment = async (
    fileId: number,
    fileName?: string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await downloadDocumentApprovalAttachment(
        electronicApprovalId,
        fileId,
        fileName,
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : '문서 첨부파일을 내려받지 못했습니다.',
      );
    }
  };

  const documentMenu = detail ? (
    <DocumentActionsMenu
      isDrafter={detail.isDrafter}
      documentStatus={detail.documentStatus}
      onEdit={() => onEditDocument(detail)}
      onDelete={() => setIsDeleteDialogOpen(true)}
    />
  ) : null;

  const feedItem = props.presentation === 'feed' ? props.feedItem : null;
  const isPinned = feedItem
    ? Boolean(feedItem.isPinned)
    : Boolean(props.isPinned);
  const pinTitle = detail?.title ?? feedItem?.title ?? '';
  const pinAriaLabel = isPinned
    ? `상단 고정 해제 ${pinTitle}`
    : `상단 고정 ${pinTitle}`;
  const displayDocumentStatus =
    detail?.documentStatus ?? feedItem?.feedData.documentStatus;
  const displayDocumentType =
    detail?.documentType ?? feedItem?.feedData.documentType;
  const statusPresentation = displayDocumentStatus
    ? getApprovalStatusPresentation(displayDocumentStatus, displayDocumentType)
    : null;
  const kindPresentation = displayDocumentType
    ? getDocumentKindPresentation(displayDocumentType)
    : null;
  const approvalActionButtonSx = {
    px: 1.25,
    py: 0.5,
  };
  const documentToolbar =
    statusPresentation && kindPresentation ? (
      <DocumentApprovalToolbar
        approvalActions={
          <>
            {canProcess && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={approvalActionButtonSx}
                  onClick={() => void handleAction('APPROVED')}
                  disabled={isActing}
                >
                  승인
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={approvalActionButtonSx}
                  onClick={() => openReasonDialog('REJECTED')}
                  disabled={isActing}
                >
                  반려
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={approvalActionButtonSx}
                  onClick={() => openReasonDialog('RETURNED')}
                  disabled={isActing}
                >
                  보완요청
                </Button>
              </>
            )}
            {canCancelSubmission && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                sx={approvalActionButtonSx}
                disabled={isActing}
                onClick={() => {
                  setActionError('');
                  setCancelDialogType('submission');
                }}
              >
                상신 취소
              </Button>
            )}
            {canCancelApproval && (
              <Button
                size="small"
                variant="contained"
                color="error"
                sx={approvalActionButtonSx}
                disabled={isActing}
                onClick={() => {
                  setActionError('');
                  setCancelDialogType('approval');
                }}
              >
                승인 취소
              </Button>
            )}
          </>
        }
        status={
          <Chip
            label={statusPresentation.label}
            size="small"
            color={statusPresentation.color}
            variant={statusPresentation.variant}
            sx={{
              height: 28,
              fontWeight: 700,
              borderRadius: approvalBadgeBorderRadius,
            }}
          />
        }
        pinControl={
          <IconButton
            aria-label={pinAriaLabel}
            title={pinAriaLabel}
            disabled={
              pinPending || !onTogglePin || electronicApprovalId === null
            }
            size="small"
            onClick={() => {
              if (!onTogglePin || electronicApprovalId === null) return;
              onTogglePin(electronicApprovalId, isPinned, pinTitle);
            }}
          >
            <PushPinOutlinedIcon
              fontSize="small"
              color={isPinned ? 'primary' : 'inherit'}
            />
          </IconButton>
        }
        moreMenu={documentMenu}
        documentKind={
          <Chip
            label={kindPresentation.label}
            size="small"
            color={kindPresentation.color}
            sx={{
              height: 28,
              fontWeight: 700,
              borderRadius: approvalBadgeBorderRadius,
            }}
          />
        }
      />
    ) : null;

  const detailCard = (
    <Stack
      spacing={2}
      data-testid="approval-detail-card"
      sx={
        isFeedPresentation
          ? { minWidth: 0 }
          : {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: { xs: 1.5, sm: 2 },
              bgcolor: 'background.paper',
            }
      }
    >
      {loadError && (
        <Alert
          severity="error"
          action={
            isFeedPresentation ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => setDetailRetryToken((token) => token + 1)}
                disabled={isLoading}
              >
                다시 시도
              </Button>
            ) : undefined
          }
        >
          {loadError}
        </Alert>
      )}
      {isFeedPresentation && isLoading && (
        <Stack
          role="status"
          aria-label="문서 상세 불러오는 중"
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', py: 1 }}
        >
          <CircularProgress size={18} />
          <Typography variant="caption">문서 상세 불러오는 중</Typography>
        </Stack>
      )}
      {detail && (
        <>
          {!isFeedPresentation && (
            <Stack
              data-testid="approval-author-row"
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 1,
                minWidth: 0,
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 220px' }}
              >
                <ProfileAvatar
                  name={detail.drafterName}
                  imageUrl={detail.drafterProfileImage}
                  fallback={detail.drafterName.slice(0, 1)}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                    {detail.drafterName}
                  </Typography>
                  <Typography
                    data-testid="approval-author-meta"
                    variant="caption"
                    color="text.secondary"
                  >
                    기안자 · {displayDate} · 조회 {detail.viewCount}
                  </Typography>
                </Box>
              </Stack>
              {documentToolbar}
            </Stack>
          )}
          {isFeedPresentation && canProcess && actionError && !reasonAction && (
            <Alert severity="error">{actionError}</Alert>
          )}
          {shouldShowApprovalLine && (
            <>
              <Box
                data-testid="approval-line-readonly"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: 'background.default',
                  minWidth: 0,
                }}
              >
                <Stack
                  data-testid="approval-line-header"
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    rowGap: 0.5,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      data-testid="approval-line-header-title"
                      variant="body1"
                      sx={{ fontWeight: 700 }}
                    >
                      {displayDocumentType === 'BUSINESS_CONTACT'
                        ? '참조자'
                        : '결재선'}
                    </Typography>
                    <Typography
                      data-testid="approval-line-drafter-meta"
                      variant="body1"
                      color="text.secondary"
                    >
                      기안자 {detail.drafterName}
                      {displayDate && ` · ${displayDate}`}
                    </Typography>
                  </Stack>
                </Stack>
                {approvalLineGroups.approval.length === 0 &&
                approvalLineGroups.agreement.length === 0 &&
                approvalLineGroups.reference.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {displayDocumentType === 'BUSINESS_CONTACT'
                      ? '참조자 정보가 없습니다.'
                      : '결재선 정보가 없습니다.'}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {approvalLineGroups.approval.length > 0 && (
                      <Box data-testid="approval-line-group-approval">
                        <Box
                          sx={{ maxWidth: '100%', overflowX: 'auto', pb: 0.5 }}
                        >
                          <Stack
                            direction="row"
                            spacing={0}
                            sx={{
                              width: 'max-content',
                              minWidth: '100%',
                              alignItems: 'center',
                            }}
                          >
                            {approvalLineGroups.approval.map((line, index) => {
                              const hasReasonPopover =
                                line.actionStatus === 'REJECTED' ||
                                line.actionStatus === 'RETURNED';
                              const actionReason = hasReasonPopover
                                ? line.actionComment
                                : null;
                              const reasonTitle =
                                line.actionStatus === 'RETURNED'
                                  ? '보완요청 사유'
                                  : '반려 사유';
                              const statusTone =
                                approvalLineStatusTones[line.actionStatus] ??
                                'neutral';
                              const isCurrent = line.actionStatus === 'PENDING';
                              return (
                                <Box
                                  key={line.electronicApprovalLineId}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Box
                                    data-testid={`approval-line-participant-${line.electronicApprovalLineId}`}
                                    data-status-tone={statusTone}
                                    aria-current={
                                      isCurrent ? 'step' : undefined
                                    }
                                    sx={{
                                      display: 'grid',
                                      gridTemplateRows: '32px 64px 32px',
                                      width: 92,
                                      border: '1px solid',
                                      borderColor:
                                        approvalLineStatusBorderColors[
                                          statusTone
                                        ],
                                      borderRadius: 1.5,
                                      overflow: 'hidden',
                                      boxShadow: isCurrent ? 2 : 0,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'grid',
                                        alignItems: 'center',
                                        minWidth: 0,
                                        px: 0.5,
                                        bgcolor: 'action.hover',
                                      }}
                                    >
                                      <Typography
                                        variant="body1"
                                        color="text.secondary"
                                        title={
                                          line.participantDepartmentName ?? ''
                                        }
                                        noWrap
                                        sx={{ textAlign: 'center' }}
                                      >
                                        {line.participantDepartmentName ?? ''}
                                      </Typography>
                                    </Box>
                                    <Box
                                      sx={{
                                        display: 'grid',
                                        alignContent: 'center',
                                        justifyItems: 'center',
                                        position: 'relative',
                                        gap: 0.25,
                                        px: 0.5,
                                        borderBlock: '1px solid',
                                        borderColor: 'divider',
                                        minWidth: 0,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Avatar
                                        data-testid={`approval-line-status-seal-${line.electronicApprovalLineId}`}
                                        data-status-tone={statusTone}
                                        aria-label={`결재 상태 ${approvalLineStatusLabel(line.actionStatus)}`}
                                        src={
                                          line.participantType === 'APPROVAL' &&
                                          completedApprovalStatuses.has(
                                            line.actionStatus,
                                          )
                                            ? (line.participantStampImage ??
                                              undefined)
                                            : undefined
                                        }
                                        alt={`결재 상태 ${approvalLineStatusLabel(line.actionStatus)}`}
                                        sx={{
                                          width: 48,
                                          height: 48,
                                          flexShrink: 0,
                                          border: '2px solid',
                                          borderStyle:
                                            statusTone === 'neutral'
                                              ? 'dashed'
                                              : 'solid',
                                          borderColor:
                                            approvalLineStatusBorderColors[
                                              statusTone
                                            ],
                                          borderRadius: '50%',
                                          bgcolor: 'background.paper',
                                          color:
                                            approvalLineStatusBorderColors[
                                              statusTone
                                            ],
                                          fontSize: '1rem',
                                          fontWeight: 700,
                                          ...(line.actionStatus ===
                                            'RETURNED' && {
                                            whiteSpace: 'pre-line',
                                            textAlign: 'center',
                                            lineHeight: 1.05,
                                          }),
                                          boxShadow: isCurrent ? 1 : 0,
                                        }}
                                      >
                                        {line.actionStatus === 'RETURNED'
                                          ? '보완\n요청'
                                          : approvalLineStatusDisplayLabel(
                                              line.actionStatus,
                                            )}
                                      </Avatar>
                                      {actionReason && actionReason.trim() && (
                                        <IconButton
                                          size="small"
                                          aria-label={`${line.participantName} ${reasonTitle} 보기`}
                                          aria-haspopup="dialog"
                                          onClick={(event) =>
                                            setReasonPopover({
                                              anchorEl: event.currentTarget,
                                              reason: actionReason,
                                              title: reasonTitle,
                                            })
                                          }
                                          sx={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 8,
                                            width: 24,
                                            height: 24,
                                            bgcolor: 'background.paper',
                                            color:
                                              approvalLineStatusColors[
                                                statusTone
                                              ],
                                            '&:hover': {
                                              bgcolor: 'background.default',
                                            },
                                          }}
                                        >
                                          <MessageOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                          />
                                        </IconButton>
                                      )}
                                      {!hasReasonPopover &&
                                        line.actionComment && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            title={line.actionComment}
                                            noWrap
                                            sx={{ maxWidth: '100%' }}
                                          >
                                            {line.actionComment}
                                          </Typography>
                                        )}
                                    </Box>
                                    <Box
                                      data-testid={`approval-line-sequence-${line.electronicApprovalLineId}`}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        minWidth: 0,
                                        width: '100%',
                                        px: 0.25,
                                      }}
                                    >
                                      <ApprovalSequenceBadge
                                        order={line.stageOrder}
                                        aria-label={`결재선 순번 ${line.stageOrder}`}
                                      />
                                      <Typography
                                        variant="body1"
                                        title={line.participantName}
                                        noWrap
                                        sx={{
                                          minWidth: 0,
                                          flex: '0 1 auto',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          textAlign: 'center',
                                          fontSize: 14,
                                        }}
                                      >
                                        {line.participantName}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  {index <
                                    approvalLineGroups.approval.length - 1 && (
                                    <ChevronRightIcon
                                      aria-hidden="true"
                                      data-testid="approval-line-connector"
                                      fontSize="small"
                                      sx={{
                                        flexShrink: 0,
                                        color: 'text.disabled',
                                      }}
                                    />
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      </Box>
                    )}
                    {(approvalLineGroups.agreement.length > 0 ||
                      approvalLineGroups.reference.length > 0) && (
                      <>
                        {approvalLineGroups.approval.length > 0 && (
                          <Divider data-testid="approval-line-inner-divider" />
                        )}
                        <Stack spacing={0.75}>
                          {approvalLineGroups.agreement.length > 0 && (
                            <Box
                              data-testid="approval-line-group-agreement"
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '64px minmax(0, 1fr)',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 0,
                                minHeight: 72,
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 700 }}
                              >
                                합의
                              </Typography>
                              <Stack
                                data-testid="approval-line-agreement-content"
                                spacing={1}
                                sx={{
                                  minWidth: 0,
                                  alignSelf: 'stretch',
                                  justifyContent: 'center',
                                }}
                              >
                                {agreementStages.map((stage) => (
                                  <Box
                                    key={stage.stageOrder}
                                    data-testid={`approval-line-agreement-stage-${stage.stageOrder}`}
                                    sx={{
                                      minWidth: 0,
                                      p: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1.5,
                                      bgcolor: 'background.paper',
                                    }}
                                  >
                                    <Box
                                      data-testid={`approval-line-agreement-stage-row-${stage.stageOrder}`}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      <ApprovalSequenceBadge
                                        order={stage.stageOrder}
                                        aria-label={`합의 순번 ${stage.stageOrder}`}
                                        testId="approval-line-agreement-stage-order"
                                      />
                                      <Box
                                        data-testid="approval-line-agreement-participants"
                                        sx={{
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: 1,
                                          minWidth: 0,
                                          flex: 1,
                                        }}
                                      >
                                        {stage.participants.map((line) => {
                                          const statusTone =
                                            approvalLineStatusTones[
                                              line.actionStatus
                                            ] ?? 'neutral';
                                          const departmentName =
                                            line.participantDepartmentName ??
                                            '';
                                          const hasDepartmentName = Boolean(
                                            departmentName.trim(),
                                          );
                                          const departmentLabel =
                                            hasDepartmentName
                                              ? departmentName
                                              : '부서없음';
                                          const statusBadge = (
                                            <Box
                                              component="span"
                                              data-testid={`approval-line-agreement-status-${line.electronicApprovalLineId}`}
                                              sx={{
                                                flex: '0 0 auto',
                                                px: 0.5,
                                                border: '1px solid',
                                                borderColor:
                                                  approvalLineStatusColors[
                                                    statusTone
                                                  ],
                                                borderRadius: '99px',
                                                color:
                                                  approvalLineStatusColors[
                                                    statusTone
                                                  ],
                                                fontWeight: 600,
                                                fontSize: 14,
                                                lineHeight: '18px',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              {approvalLineStatusLabel(
                                                line.actionStatus,
                                              )}
                                            </Box>
                                          );
                                          return (
                                            <Box
                                              key={
                                                line.electronicApprovalLineId
                                              }
                                              data-testid={`approval-line-agreement-participant-${line.electronicApprovalLineId}`}
                                              sx={{
                                                display: 'flex',
                                                flex: '1 1 240px',
                                                alignItems: 'center',
                                                gap: 1,
                                                minWidth: 'min(100%, 190px)',
                                                maxWidth: '100%',
                                                height: 56,
                                                boxSizing: 'border-box',
                                                px: 1,
                                                py: 0.75,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: '10px',
                                                bgcolor: 'background.paper',
                                              }}
                                            >
                                              <ProfileAvatar
                                                data-testid={`approval-line-agreement-avatar-${line.electronicApprovalLineId}`}
                                                name={line.participantName}
                                                imageUrl={line.participantProfileImage}
                                                fallback={line.participantName.slice(0, 1)}
                                                sx={{
                                                  width: 32,
                                                  height: 32,
                                                  flexShrink: 0,
                                                }}
                                              />
                                              <Box
                                                sx={{
                                                  display: 'flex',
                                                  flex: 1,
                                                  minWidth: 0,
                                                  flexDirection: 'column',
                                                  justifyContent: 'center',
                                                }}
                                              >
                                                <Typography
                                                  variant="body1"
                                                  title={line.participantName}
                                                  noWrap
                                                  sx={{
                                                    display: 'block',
                                                    minWidth: 0,
                                                    fontSize: 14,
                                                    lineHeight: '18px',
                                                  }}
                                                >
                                                  {line.participantName}
                                                </Typography>
                                                <Box
                                                  sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    minWidth: 0,
                                                  }}
                                                >
                                                  <Typography
                                                    data-testid={`approval-line-agreement-department-${line.electronicApprovalLineId}`}
                                                    variant="body1"
                                                    title={departmentLabel}
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{
                                                      minWidth: 0,
                                                      flex: 1,
                                                      fontSize: 14,
                                                      lineHeight: '18px',
                                                    }}
                                                  >
                                                    {departmentLabel}
                                                  </Typography>
                                                  {statusBadge}
                                                </Box>
                                              </Box>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {approvalLineGroups.reference.length > 0 && (
                            <Box
                              data-testid="approval-line-group-reference"
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '64px minmax(0, 1fr)',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 0,
                                minHeight: 72,
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 700 }}
                              >
                                참조
                              </Typography>
                              <Box
                                data-testid="approval-line-reference-participants"
                                sx={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 1,
                                  minWidth: 0,
                                }}
                              >
                                {approvalLineGroups.reference.map((line) => {
                                  const departmentName =
                                    line.participantDepartmentName ?? '';
                                  const hasDepartmentName = Boolean(
                                    departmentName.trim(),
                                  );
                                  const departmentLabel = hasDepartmentName
                                    ? departmentName
                                    : '부서없음';
                                  return (
                                    <Box
                                      key={line.electronicApprovalLineId}
                                      data-testid={`approval-line-reference-participant-${line.electronicApprovalLineId}`}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        flex: '1 1 240px',
                                        minWidth: 'min(100%, 190px)',
                                        maxWidth: '100%',
                                        height: 56,
                                        boxSizing: 'border-box',
                                        px: 1,
                                        py: 0.75,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: '10px',
                                        bgcolor: 'background.paper',
                                      }}
                                    >
                                      <ProfileAvatar
                                        data-testid={`approval-line-reference-avatar-${line.electronicApprovalLineId}`}
                                        name={line.participantName}
                                        imageUrl={line.participantProfileImage}
                                        fallback={line.participantName.slice(0, 1)}
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography
                                          variant="body1"
                                          title={line.participantName}
                                          noWrap
                                          sx={{
                                            display: 'block',
                                            fontSize: 14,
                                            lineHeight: '18px',
                                          }}
                                        >
                                          {line.participantName}
                                        </Typography>
                                        <Typography
                                          data-testid={`approval-line-reference-department-${line.electronicApprovalLineId}`}
                                          variant="body1"
                                          title={departmentLabel}
                                          noWrap
                                          color="text.secondary"
                                          sx={{
                                            fontSize: 14,
                                            lineHeight: '18px',
                                          }}
                                        >
                                          {departmentLabel}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      </>
                    )}
                  </Stack>
                )}
              </Box>
              <Divider data-testid="approval-line-divider" sx={{ my: 1.5 }} />
            </>
          )}
          {!isFeedPresentation && (
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
            >
              {detail.title}
            </Typography>
          )}
          <FeedBodyContent
            hasMore={hasMoreBody}
            isExpanded={isBodyExpanded}
            onToggleExpand={() => setIsBodyExpanded((expanded) => !expanded)}
            contentTestId="approval-document-body"
            richText={{
              collapsedHtml: collapsedBodyHtml,
              expandedHtml: expandedBodyHtml,
              images: bodyImages.map(({ src, alt }) => ({ src, alt })),
              imageError: bodyImageError || undefined,
              onOpenImage: setSelectedBodyImage,
            }}
          />
          <Box data-testid="approval-feed-footer">
            <Box>
              <AttachmentList
                files={detail.attachments.map((attachment) => ({
                  id: String(attachment.fileId),
                  name: attachment.fileName ?? `파일 ${attachment.fileId}`,
                  size: attachment.fileSize,
                }))}
                showActions
                onDownload={(fileId) => {
                  const attachment = detail.attachments.find(
                    (file) => String(file.fileId) === fileId,
                  );
                  if (attachment) {
                    void handleDownloadDocumentAttachment(
                      attachment.fileId,
                      attachment.fileName,
                    );
                  }
                }}
              />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <FeedReactionBar
              liked={isLiked}
              likeCount={0}
              bookmarked={isBookmarked}
              commentCount={commentCount}
              onToggleLike={() => setIsLiked((value) => !value)}
              onToggleBookmark={() => setIsBookmarked((value) => !value)}
            />
            <FeedCommentsSection
              showPrevious={hasPreviousComments}
              isLoadingPrevious={isLoadingComments}
              remainingPreviousCount={
                Number.isFinite(commentCount)
                  ? Math.max(
                      0,
                      commentCount -
                        commentRecords.filter(
                          (comment) => comment.parentCommentId == null,
                        ).length -
                        commentSystemEvents.length,
                    )
                  : undefined
              }
              onLoadPrevious={() => void handleLoadPreviousComments()}
            >
              <>
                {commentError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleRetryComments}
                        disabled={isLoadingComments}
                      >
                        다시 시도
                      </Button>
                    }
                  >
                    {commentError}
                  </Alert>
                )}
                {isLoadingComments && commentRecords.length === 0 ? (
                  <Box
                    role="status"
                    aria-label="댓글 불러오는 중"
                    sx={{ py: 2 }}
                  >
                    <CircularProgress size={20} />
                  </Box>
                ) : null}
                <CommentThread
                  comments={toApprovalCommentTree(
                    commentRecords,
                    commentSystemEvents,
                    commentImageUrls,
                    commentImageErrors,
                  )}
                  onSubmitComment={(content, files) =>
                    handleAddComment(content, files)
                  }
                  onSubmitReply={(commentId, content, files) =>
                    handleAddComment(content, files, commentId)
                  }
                  onEditComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onDownloadAttachment={handleDownloadCommentAttachment}
                  onDeleteAttachment={handleDeleteCommentAttachment}
                  onOpenAttachmentImage={setSelectedBodyImage}
                  expandReplies
                />
              </>
            </FeedCommentsSection>
          </Box>
          {!isFeedPresentation && canProcess && (
            <>
              <Divider />
              <TextField
                label="처리 의견"
                value={actionComment}
                onChange={(event) => setActionComment(event.target.value)}
                multiline
                minRows={2}
                fullWidth
                disabled={isActing}
              />
              {actionError && !reasonAction && (
                <Alert severity="error">{actionError}</Alert>
              )}
              {isActing && <CircularProgress size={24} />}
            </>
          )}
        </>
      )}
    </Stack>
  );

  return (
    <>
      {props.presentation === 'feed' ? (
        <FeedCard
          author={detail?.drafterName ?? props.feedItem.author}
          authorProfileImageUrl={
            detail
              ? detail.drafterProfileImage
              : props.feedItem.feedData.drafterProfileImage
          }
          meta={
            detail
              ? `기안자 · ${displayDate} · 조회 ${detail.viewCount}`
              : props.feedItem.date
          }
          actions={documentToolbar}
          badges={null}
          title={detail?.title ?? props.feedItem.title}
          isDark={isDark}
          testId="document-write-item"
        >
          {detailCard}
        </FeedCard>
      ) : (
        <PostDetailPanel
          title="문서 상세"
          subtitle={
            electronicApprovalId === null
              ? undefined
              : `문서 ID: ${electronicApprovalId}`
          }
          onClose={props.onClose}
          isLoading={isLoading}
          loadingLabel="문서 상세 불러오는 중"
        >
          {detailCard}
        </PostDetailPanel>
      )}
      <Popover
        open={reasonPopover !== null}
        anchorEl={reasonPopover?.anchorEl}
        onClose={() => setReasonPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': reasonPopover?.title,
            sx: {
              p: 1.5,
              width: 300,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {reasonPopover?.title}
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {reasonPopover?.reason}
        </Typography>
      </Popover>
      <CommonDialog
        open={reasonAction !== null}
        onClose={closeReasonDialog}
        title={reasonAction === 'REJECTED' ? '반려 사유' : '보완요청 사유'}
        description="처리 사유를 입력해 주세요."
        size="xs"
        actions={
          <>
            <Button onClick={closeReasonDialog} disabled={isActing}>
              취소
            </Button>
            <Button
              variant={reasonAction === 'REJECTED' ? 'outlined' : 'outlined'}
              color={reasonAction === 'REJECTED' ? 'error' : 'warning'}
              onClick={() => {
                if (reasonAction) void handleAction(reasonAction);
              }}
              disabled={isActing}
            >
              {isActing
                ? '처리 중...'
                : reasonAction === 'REJECTED'
                  ? '반려 확인'
                  : '보완요청 확인'}
            </Button>
          </>
        }
      >
        <TextField
          autoFocus
          label="처리 사유"
          value={actionComment}
          onChange={(event) => {
            setActionComment(event.target.value);
            setActionError('');
          }}
          multiline
          minRows={3}
          fullWidth
          disabled={isActing}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {actionError}
          </Alert>
        )}
      </CommonDialog>
      <Dialog
        open={cancelDialogType !== null}
        onClose={() => !isActing && setCancelDialogType(null)}
        aria-labelledby="approval-cancel-dialog-title"
      >
        <DialogTitle id="approval-cancel-dialog-title">
          {cancelDialogType === 'submission' ? '결재신청 취소' : '승인 취소'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {cancelDialogType === 'submission'
              ? '결재신청을 취소하고 임시저장 상태로 되돌립니다.'
              : '본인의 승인을 취소합니다.'}
          </DialogContentText>
          {actionError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="error"
            onClick={() => void handleCancelDocumentAction()}
            disabled={isActing}
          >
            {isActing
              ? '취소 중...'
              : cancelDialogType === 'submission'
                ? '상신 취소'
                : '승인 취소'}
          </Button>
          <Button onClick={() => setCancelDialogType(null)} disabled={isActing}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        aria-labelledby="approval-delete-dialog-title"
      >
        <DialogTitle id="approval-delete-dialog-title">
          문서를 삭제하시겠습니까?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            삭제한 문서는 목록에서 숨겨지며 복구할 수 없습니다.
          </DialogContentText>
          {actionError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDeleteDocument()}
            disabled={isDeleting}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
          <Button
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            취소
          </Button>
        </DialogActions>
      </Dialog>
      <ImageViewerDialog
        open={Boolean(selectedBodyImage)}
        src={selectedBodyImage?.src ?? ''}
        alt={selectedBodyImage?.alt ?? '본문 이미지'}
        onClose={() => setSelectedBodyImage(null)}
      />
    </>
  );
}
