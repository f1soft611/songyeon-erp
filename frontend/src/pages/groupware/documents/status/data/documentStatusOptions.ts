export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'DRAFTING', label: '기안서' },
  { value: 'BUSINESS_CONTACT', label: '업무연락' },
  { value: 'EXPENSE_RESOLUTION', label: '지출결의서' },
  { value: 'ATTENDANCE_APPLICATION', label: '근태신청' },
];

export const DOCUMENT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: '임시저장' },
  { value: 'PENDING', label: '결재대기' },
  { value: 'IN_PROGRESS', label: '결재진행' },
  { value: 'REVISION_REQUESTED', label: '보완요청' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'REJECTED', label: '반려' },
];

export const PARTICIPANT_TYPE_OPTIONS = [
  { value: 'DRAFTER', label: '기안' },
  { value: 'APPROVAL', label: '결재' },
  { value: 'AGREEMENT', label: '합의' },
  { value: 'REFERENCE', label: '참조' },
];

export const ACTION_STATUS_OPTIONS = [
  { value: 'WAITING', label: '대기' },
  { value: 'PENDING', label: '처리 중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'RETURNED', label: '보완요청' },
];

export const DOCUMENT_TYPES = new Set(DOCUMENT_TYPE_OPTIONS.map(({ value }) => value));
export const DOCUMENT_STATUSES = new Set(DOCUMENT_STATUS_OPTIONS.map(({ value }) => value));
export const PARTICIPANT_TYPES = new Set(PARTICIPANT_TYPE_OPTIONS.map(({ value }) => value));
export const ACTION_STATUSES = new Set(ACTION_STATUS_OPTIONS.map(({ value }) => value));

export const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING: 'info',
  IN_PROGRESS: 'info',
  REVISION_REQUESTED: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
} as const;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
);

export const PARTICIPANT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PARTICIPANT_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
);

export const ACTION_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
);
