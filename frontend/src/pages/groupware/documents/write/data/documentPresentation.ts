import type {
  ApprovalDocumentStatus,
  ApprovalStatusColor,
  ApprovalStatus,
  DocumentApprovalRecord,
  DocumentApprovalScope,
  DocumentKind,
} from '../types/documentWrite.types';

export type { ApprovalStatusColor } from '../types/documentWrite.types';
export type DocumentKindColor = 'primary' | 'info' | 'warning' | 'secondary';

export type ApprovalStatusPresentation = {
  label: ApprovalStatus;
  color: ApprovalStatusColor;
  variant: 'filled' | 'outlined';
};

export type DocumentKindPresentation = {
  label: string;
  color: DocumentKindColor;
};

const approvalStatusPresentation: Record<
  ApprovalDocumentStatus,
  ApprovalStatusPresentation
> = {
  DRAFT: { label: '임시저장', color: 'default', variant: 'outlined' },
  PENDING: { label: '결재진행중', color: 'info', variant: 'filled' },
  IN_PROGRESS: { label: '결재진행중', color: 'info', variant: 'filled' },
  COMPLETED: { label: '승인', color: 'success', variant: 'filled' },
  REJECTED: { label: '반려', color: 'error', variant: 'filled' },
  REVISION_REQUESTED: { label: '보완요청', color: 'warning', variant: 'filled' },
};

const documentKindPresentation: Record<DocumentKind, DocumentKindPresentation> = {
  기안서: { label: '기안', color: 'primary' },
  업무연락: { label: '업무', color: 'info' },
  지출결의서: { label: '지출', color: 'warning' },
  근태신청: { label: '근태', color: 'secondary' },
};

const documentKindByType: Record<DocumentApprovalRecord['documentType'], DocumentKind> = {
  DRAFTING: '기안서',
  BUSINESS_CONTACT: '업무연락',
  EXPENSE_RESOLUTION: '지출결의서',
  ATTENDANCE_APPLICATION: '근태신청',
};

const documentApprovalScopeLabels: Record<DocumentApprovalScope, string> = {
  ALL: '전체',
  MY_PENDING: '내가 처리할 결재',
  IN_PROGRESS: '결재 진행 중',
  DRAFT: '작성 중 문서',
  COMPLETED: '승인',
  REVISION_REQUESTED: '보완요청',
  REJECTED: '반려',
};

function isDocumentType(
  value: DocumentKind | DocumentApprovalRecord['documentType'],
): value is DocumentApprovalRecord['documentType'] {
  return Object.prototype.hasOwnProperty.call(documentKindByType, value);
}

export function getApprovalStatusPresentation(
  status: ApprovalDocumentStatus,
  documentType?: DocumentApprovalRecord['documentType'],
): ApprovalStatusPresentation {
  if (status === 'COMPLETED' && documentType === 'BUSINESS_CONTACT') {
    return { label: '발송완료', color: 'success', variant: 'filled' };
  }
  return approvalStatusPresentation[status];
}

export function formatApprovalSystemEventContent(
  eventType: string,
  content: string,
): string {
  const prefix =
    eventType === 'REJECTED'
      ? '문서가 반려되었습니다.'
      : eventType === 'RETURNED'
        ? '문서 보완이 요청되었습니다.'
        : null;
  if (!prefix || !content.startsWith(`${prefix} 사유: `)) return content;
  return `${prefix}\n${content.slice(prefix.length + 1)}`;
}

export function getApprovalSystemEventPresentation(
  eventType: string,
): Omit<ApprovalStatusPresentation, 'label'> & { label: string } | undefined {
  switch (eventType) {
    case 'DRAFT_SAVED':
      return getApprovalStatusPresentation('DRAFT');
    case 'SUBMITTED':
      return { ...getApprovalStatusPresentation('PENDING'), label: '결재신청' };
    case 'RESUBMITTED':
      return { ...getApprovalStatusPresentation('PENDING'), label: '재상신' };
    case 'SUBMISSION_CANCELED':
      return { ...getApprovalStatusPresentation('REJECTED'), label: '결재신청 취소', variant: 'outlined' };
    case 'APPROVAL_CANCELED':
      return { ...getApprovalStatusPresentation('REJECTED'), label: '결재 승인 취소', variant: 'outlined' };
    case 'REJECTED':
      return getApprovalStatusPresentation('REJECTED');
    case 'APPROVED':
      return getApprovalStatusPresentation('COMPLETED');
    case 'COMPLETED':
      return { ...getApprovalStatusPresentation('COMPLETED'), label: '완료' };
    case 'RETURNED':
      return getApprovalStatusPresentation('REVISION_REQUESTED');
    default:
      return undefined;
  }
}

export function getDocumentKindFromType(
  documentType: DocumentApprovalRecord['documentType'],
): DocumentKind {
  return documentKindByType[documentType];
}

export function getDocumentApprovalScopeLabel(
  scope: DocumentApprovalScope,
): string {
  return documentApprovalScopeLabels[scope];
}

export function getDocumentKindPresentation(
  kind: DocumentKind | DocumentApprovalRecord['documentType'],
): DocumentKindPresentation {
  const documentKind = isDocumentType(kind) ? documentKindByType[kind] : kind;
  return documentKindPresentation[documentKind];
}
