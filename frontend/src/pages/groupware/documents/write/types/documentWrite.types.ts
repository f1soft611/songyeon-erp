import type {
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { JSONContent } from '@tiptap/core';
import type { RichTextEditorImage } from '../../../../../shared/components/rich-text-editor/richTextEditor.types';
import type { DocumentDateSourceLabel } from '../data/documentDate';

export type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
export type ApprovalStatus = '임시저장' | '결재진행중' | '승인' | '반려' | '보완요청' | '발송완료';
export type ApprovalStatusColor = 'default' | 'info' | 'success' | 'error' | 'warning';
export type ApprovalDocumentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'REJECTED';
export type DocumentApprovalScope =
  | 'ALL'
  | 'MY_PENDING'
  | 'IN_PROGRESS'
  | 'DRAFT'
  | 'COMPLETED'
  | 'REVISION_REQUESTED'
  | 'REJECTED';

export type DocumentApprovalStage = {
  id: number;
  kind: 'approval' | 'agreement';
  users: F1GridUserOption[];
  isFixed?: boolean;
};

export type ApprovalLineTemplateEabusNo = '001' | '008' | '004' | '031';
export type ApprovalLineTemplateParticipantType =
  | 'APPROVAL'
  | 'AGREEMENT'
  | 'REFERENCE';

export type ApprovalLineTemplateParticipant = {
  stageOrder: number;
  participantOrder: number;
  participantType: ApprovalLineTemplateParticipantType;
  participantUserId: string;
};

export type ApprovalLineTemplateSummary = {
  templateId: number;
  name: string;
  eabusNo: ApprovalLineTemplateEabusNo;
  updatedAt?: string | number | null;
};

export type ApprovalLineTemplate = ApprovalLineTemplateSummary & {
  approvalLines: ApprovalLineTemplateParticipant[];
};

export type ApprovalLineTemplateSaveRequest = {
  eabusNo: ApprovalLineTemplateEabusNo;
  name: string;
  approvalLines: ApprovalLineTemplateParticipant[];
};

export type DocumentWriteItem = {
  id: number;
  eabusNo?: string;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  statusColor?: ApprovalStatusColor;
  statusVariant?: 'filled' | 'outlined';
  badgeBorderRadius?: string;
  author: string;
  date: string;
  dateSourceLabel?: DocumentDateSourceLabel;
  submittedDate?: string;
  summary: string;
  isPinned?: boolean;
  isDrafter?: boolean;
  documentStatus?: ApprovalDocumentStatus;
  feedData?: DocumentApprovalFeedRecord;
};

export type DocumentFeedWriteItem = DocumentWriteItem & {
  feedData: DocumentApprovalFeedRecord;
};

export type DocumentWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export type DocumentApprovalDraftRequest = {
  documentType: 'DRAFTING' | 'BUSINESS_CONTACT' | 'EXPENSE_RESOLUTION' | 'ATTENDANCE_APPLICATION';
  draftingWorkCategoryId: number | null;
  title: string;
  contentsJson: JSONContent;
  contentsHtml: string;
  contentsText: string;
  approvalLines: {
    stageOrder: number;
    participantOrder: number;
    participantType: 'APPROVAL' | 'AGREEMENT' | 'REFERENCE';
    participantUserId: string;
  }[];
  embeddedImages: DocumentDraftEmbeddedImageMetadata[];
  temporaryImages: DocumentDraftTemporaryImage[];
};

export type DocumentDraftEmbeddedImageMetadata = {
  uploadToken: string;
  fileName: string;
  imageUrl?: string | null;
  fileId?: string | null;
  objectKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | string | null;
};

export type DocumentDraftTemporaryImage = {
  uploadToken: string;
  fileName: string;
};

export type DocumentDraftEmbeddedImageUpload = RichTextEditorImage & {
  fileName: string;
  uploadToken: string;
  src: string;
  alt: string;
  fileSize: number;
  mimeType: string;
  objectKey: string;
};

export type DocumentApprovalDraftResponse = {
  electronicApprovalId: number;
  documentStatus: ApprovalDocumentStatus;
  eabusNo?: string;
  submittedAt?: string | null;
};

export type DocumentApprovalRecord = {
  electronicApprovalId: number;
  eabusNo: string;
  documentType: DocumentApprovalDraftRequest['documentType'];
  documentStatus: ApprovalDocumentStatus;
  title: string;
  drafterName: string;
  drafterProfileImage?: string | null;
  isDrafter?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  summary: string;
  noticeType?: 'ACTION_REQUIRED' | 'REVISION_REQUESTED' | null;
};

export type DocumentApprovalPageRequest = {
  offset: number;
  limit: number;
};

export type DocumentApprovalPage<T> = {
  resultList: T[];
  totalRowCount: number;
};

export type DocumentApprovalPinState = {
  electronicApprovalId: number;
  pinned: boolean;
};

export type DocumentApprovalSummary = {
  actionRequiredCount: number;
  inProgressCount: number;
  draftCount: number;
  completedCount: number;
  revisionRequestedCount: number;
  rejectedCount: number;
  notices: DocumentApprovalRecord[];
};

export type DocumentApprovalLine = {
  electronicApprovalLineId: number;
  stageOrder: number;
  participantOrder: number;
  participantType: 'APPROVAL' | 'AGREEMENT' | 'REFERENCE';
  participantUserId: string;
  participantName: string;
  participantDepartmentName?: string | null;
  participantProfileImage?: string | null;
  participantStampImage?: string | null;
  actionStatus: string;
  pendingAt?: string | null;
  actionAt?: string | null;
  actionComment?: string | null;
};

export type DocumentApprovalSystemEvent = {
  commentId?: number;
  commentType?: 'SYSTEM';
  ownerId?: number;
  eventType: string;
  content: string;
  writerName: string;
  writerProfileImage?: string | null;
  createdAt?: string | null;
};

export type DocumentApprovalPageSystemEvent = DocumentApprovalSystemEvent & {
  commentId: number;
  commentType: 'SYSTEM';
  ownerId: number;
};

export type DocumentApprovalDetail = Omit<DocumentApprovalRecord, 'summary'> & {
  summary?: string;
  viewCount: number;
  isDrafter: boolean;
  draftingWorkCategoryId: number | null;
  contentsJson: string;
  contentsHtml: string;
  approvalLines: DocumentApprovalLine[];
  attachments: DocumentDraftAttachmentResponse[];
  systemEvents: DocumentApprovalSystemEvent[];
};

export type DocumentApprovalFeedRecord = DocumentApprovalRecord &
  Omit<DocumentApprovalDetail, keyof DocumentApprovalRecord> & {
    isDrafter: boolean;
    contentsText: string;
    systemEvents: DocumentApprovalPageSystemEvent[];
    comments: DocumentApprovalComment[];
    commentCount: number;
    hasPreviousComments: boolean;
    nextBeforeCommentId: number | null;
  };

export type DocumentApprovalActionRequest = {
  action: 'APPROVED' | 'REJECTED' | 'RETURNED';
  actionComment?: string;
};

export type DocumentDraftAttachmentStatus =
  | 'pending'
  | 'uploaded'
  | 'failed'
  | 'unknown';

export type DocumentDraftAttachment = {
  clientId: string;
  file: File | null;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: DocumentDraftAttachmentStatus;
  fileId?: number;
  error?: string;
};

export type DocumentDraftAttachmentResponse = {
  fileId: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type DocumentApprovalCommentAttachment = DocumentDraftAttachmentResponse;

export type DocumentFileItem = {
  fileId: number;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  uploadedByName: string;
  createdAt: string;
  electronicApprovalId: number;
  documentTitle: string;
  commentId: number | null;
};

export type DocumentFileQuery = {
  scope: DocumentApprovalScope;
  documentType?: DocumentApprovalRecord['documentType'];
  electronicApprovalId?: number;
  beforeFileId?: number;
};

export type DocumentFilePage = {
  resultList: DocumentFileItem[];
  hasNext: boolean;
  nextBeforeFileId: number | null;
};

export type DocumentApprovalComment = {
  commentId: number;
  tenantId?: number;
  ownerType?: 'APPROVAL';
  ownerId: number;
  parentCommentId?: number | null;
  content: string;
  commentType: 'USER';
  eventType?: null;
  writerId: string | null;
  writerName: string;
  writerProfileImage?: string | null;
  deletedYn?: 'Y' | 'N';
  createdAt?: string | null;
  updatedAt?: string | null;
  attachments?: DocumentApprovalCommentAttachment[];
};

export type DocumentApprovalCommentPage = {
  comments: DocumentApprovalComment[];
  systemEvents: DocumentApprovalPageSystemEvent[];
  hasPrevious: boolean;
  nextBeforeCommentId: number | null;
  resultCnt: number;
};
