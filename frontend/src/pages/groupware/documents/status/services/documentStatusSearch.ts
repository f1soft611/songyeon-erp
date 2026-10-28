import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import {
  ACTION_STATUSES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  PARTICIPANT_TYPES,
} from '../data/documentStatusOptions';
import type { DocumentStatusFilters } from '../types/documentStatus.types';
import type {
  DocumentStatusSearchSession,
  DocumentStatusSearchValues,
} from '../types/documentStatusSearch.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) => key === 'from' || key === 'to') &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  );
}

export function isDocumentStatusSearchSession(
  value: unknown,
): value is DocumentStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function cloneDetailValues(
  values: DocumentStatusSearchValues,
): DocumentStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readTextValue(
  values: DocumentStatusSearchValues,
  field: string,
): string | undefined {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function readDateRange(
  values: DocumentStatusSearchValues,
  field: string,
): { from?: string; to?: string } {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  const from = value.from?.trim();
  const to = value.to?.trim();
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

function isDocumentType(
  value: string,
): value is NonNullable<DocumentStatusFilters['documentType']> {
  return DOCUMENT_TYPES.has(value);
}

function isDocumentStatus(
  value: string,
): value is NonNullable<DocumentStatusFilters['documentStatus']> {
  return DOCUMENT_STATUSES.has(value);
}

function isParticipantType(
  value: string,
): value is NonNullable<DocumentStatusFilters['myParticipantType']> {
  return PARTICIPANT_TYPES.has(value);
}

function isActionStatus(
  value: string,
): value is NonNullable<DocumentStatusFilters['myActionStatus']> {
  return ACTION_STATUSES.has(value);
}

export function toDocumentStatusFilters(
  keyword: string,
  values: DocumentStatusSearchValues,
): DocumentStatusFilters {
  const filters: DocumentStatusFilters = {};
  const normalizedKeyword = keyword.trim();
  if (normalizedKeyword) filters.keyword = normalizedKeyword;

  const electronicApprovalId = readTextValue(values, 'electronicApprovalId');
  const title = readTextValue(values, 'title');
  const documentType = readTextValue(values, 'documentType');
  const documentStatus = readTextValue(values, 'documentStatus');
  const drafterName = readTextValue(values, 'drafterName');
  const drafterDepartmentName = readTextValue(values, 'drafterDepartmentName');
  const participantName = readTextValue(values, 'participantName');
  const myParticipantType = readTextValue(values, 'myParticipantType');
  const myActionStatus = readTextValue(values, 'myActionStatus');
  const currentApproverName = readTextValue(values, 'currentApprovalStep');
  const submittedAt = readDateRange(values, 'submittedAt');
  const updatedAt = readDateRange(values, 'updatedAt');

  if (electronicApprovalId) filters.electronicApprovalId = electronicApprovalId;
  if (title) filters.title = title;
  if (documentType && isDocumentType(documentType)) {
    filters.documentType = documentType;
  }
  if (documentStatus && isDocumentStatus(documentStatus)) {
    filters.documentStatus = documentStatus;
  }
  if (drafterName) filters.drafterName = drafterName;
  if (drafterDepartmentName) {
    filters.drafterDepartmentName = drafterDepartmentName;
  }
  if (participantName) filters.participantName = participantName;
  if (myParticipantType && isParticipantType(myParticipantType)) {
    filters.myParticipantType = myParticipantType;
  }
  if (myActionStatus && isActionStatus(myActionStatus)) {
    filters.myActionStatus = myActionStatus;
  }
  if (currentApproverName) filters.currentApproverName = currentApproverName;
  if (submittedAt.from) filters.submittedAtFrom = submittedAt.from;
  if (submittedAt.to) filters.submittedAtTo = submittedAt.to;
  if (updatedAt.from) filters.updatedAtFrom = updatedAt.from;
  if (updatedAt.to) filters.updatedAtTo = updatedAt.to;
  return filters;
}
