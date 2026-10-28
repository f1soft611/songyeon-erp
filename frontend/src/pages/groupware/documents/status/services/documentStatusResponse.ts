import {
  ACTION_STATUSES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  PARTICIPANT_TYPES,
} from '../data/documentStatusOptions';
import type { DocumentStatusRow } from '../types/documentStatus.types';
import type { DocumentStatusPageResponse } from '../types/documentStatusApi.types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDateValue(value: unknown): value is string | number | null {
  return (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function normalizeDateValue(
  value: string | number | null | undefined,
): string | null {
  if (value === undefined) return null;
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return value;
}

function isDocumentStatusRow(value: unknown): value is DocumentStatusRow {
  if (!isObject(value)) return false;
  return (
    Number.isSafeInteger(value.electronicApprovalId) &&
    Number(value.electronicApprovalId) > 0 &&
    typeof value.title === 'string' &&
    typeof value.documentType === 'string' &&
    DOCUMENT_TYPES.has(value.documentType) &&
    typeof value.documentStatus === 'string' &&
    DOCUMENT_STATUSES.has(value.documentStatus) &&
    (value.drafterDepartmentName === null ||
      typeof value.drafterDepartmentName === 'string') &&
    typeof value.drafterName === 'string' &&
    isDateValue(value.submittedAt) &&
    isDateValue(value.updatedAt) &&
    typeof value.participantName === 'string' &&
    typeof value.myParticipantType === 'string' &&
    isTokenSet(value.myParticipantType, PARTICIPANT_TYPES) &&
    typeof value.myActionStatus === 'string' &&
    isTokenSet(value.myActionStatus, ACTION_STATUSES) &&
    typeof value.currentApprovalStep === 'string' &&
    typeof value.approvalProgress === 'string'
  );
}

function isTokenSet(value: string, allowedTokens: Set<string>): boolean {
  return (
    value === '' ||
    value.split(', ').every((token) => allowedTokens.has(token))
  );
}

export function validatePageResponse(value: unknown): DocumentStatusPageResponse {
  if (
    !isObject(value) ||
    !Array.isArray(value.resultList) ||
    !value.resultList.every(isDocumentStatusRow) ||
    !Number.isSafeInteger(value.totalRowCount) ||
    Number(value.totalRowCount) < 0
  ) {
    throw new Error('전자결재 문서 검색 응답을 확인할 수 없습니다.');
  }

  return {
    resultList: value.resultList.map((row) => ({
      ...row,
      submittedAt: normalizeDateValue(row.submittedAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
    totalRowCount: Number(value.totalRowCount),
  };
}
