import type {
  ApprovalDocumentStatus,
  DocumentApprovalRecord,
  DocumentApprovalScope,
} from '../../write/types/documentWrite.types';

export type DocumentStatusRow = Pick<
  DocumentApprovalRecord,
  | 'electronicApprovalId'
  | 'documentNo'
  | 'title'
  | 'documentType'
  | 'documentStatus'
  | 'drafterName'
  | 'submittedAt'
  | 'updatedAt'
> & {
  rowNumber?: number;
  drafterDepartmentName: string | null;
  participantName: string;
  myParticipantType: string;
  myActionStatus: string;
  currentApprovalStep: string;
  approvalProgress: string;
};

export type DocumentStatusParticipantType =
  | 'DRAFTER'
  | 'APPROVAL'
  | 'AGREEMENT'
  | 'REFERENCE';

export type DocumentStatusActionStatus =
  | 'WAITING'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CONFIRMED';

export type DocumentStatusFilters = {
  scope?: DocumentApprovalScope;
  keyword?: string;
  electronicApprovalId?: string;
  documentNo?: string;
  title?: string;
  documentType?: DocumentApprovalRecord['documentType'];
  documentStatus?: ApprovalDocumentStatus;
  submittedAtFrom?: string;
  submittedAtTo?: string;
  drafterName?: string;
  drafterDepartmentName?: string;
  participantName?: string;
  myParticipantType?: DocumentStatusParticipantType;
  myActionStatus?: DocumentStatusActionStatus;
  currentApproverName?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
};

export type { DocumentStatusPageResponse } from './documentStatusApi.types';
