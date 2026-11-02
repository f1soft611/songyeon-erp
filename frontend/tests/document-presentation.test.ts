import { describe, expect, it } from 'vitest';
import {
  formatApprovalSystemEventContent,
  getApprovalStatusPresentation,
  getApprovalSystemEventPresentation,
  parseDocumentApprovalScope,
  getDocumentKindPresentation,
} from '../src/pages/groupware/documents/write/data/documentPresentation';

describe('document presentation metadata', () => {
  it.each([
    ['MY_PENDING', 'MY_PENDING'],
    ['DRAFT', 'DRAFT'],
    ['REVISION_REQUESTED', 'REVISION_REQUESTED'],
  ] as const)('accepts the dashboard scope %s', (value, scope) => {
    expect(parseDocumentApprovalScope(value)).toBe(scope);
  });

  it.each([null, '', 'unknown', 'constructor'])(
    'ignores unsupported approval scope %s',
    (value) => {
      expect(parseDocumentApprovalScope(value)).toBeNull();
    },
  );

  it('labels a completed business contact as sent instead of approved', () => {
    expect(getApprovalStatusPresentation('COMPLETED', 'BUSINESS_CONTACT')).toEqual({
      label: '발송완료',
      color: 'success',
      variant: 'filled',
    });
    expect(getApprovalStatusPresentation('COMPLETED', 'DRAFTING').label).toBe('승인');
  });

  it.each([
    ['REJECTED', '문서가 반려되었습니다.'],
    ['RETURNED', '문서 보완이 요청되었습니다.'],
  ])('separates the %s event description from its multiline reason', (eventType, prefix) => {
    const reason = '첫째\n둘째\n\n사유: 본문에 포함한 문구';
    const formatted = `${prefix}\n사유: ${reason}`;
    expect(formatApprovalSystemEventContent(eventType, `${prefix} 사유: ${reason}`)).toBe(formatted);
    expect(formatApprovalSystemEventContent(eventType, formatted)).toBe(formatted);
    expect(formatApprovalSystemEventContent(eventType, prefix)).toBe(prefix);
  });

  it.each(['APPROVED', 'USER', 'UNKNOWN'])('does not reformat an unrelated %s event', (eventType) => {
    const content = '문서 보완이 요청되었습니다. 사유: 원문\n사유: 유지';
    expect(formatApprovalSystemEventContent(eventType, content)).toBe(content);
  });

  it('leaves an unrecognized message unchanged', () => {
    const content = '설명 사유: 원문';
    expect(formatApprovalSystemEventContent('RETURNED', content)).toBe(content);
  });

  it.each([
    ['DRAFT_SAVED', '임시저장', 'default', 'outlined', 'DRAFT'],
    ['SUBMITTED', '결재신청', 'info', 'filled', 'PENDING'],
    ['RESUBMITTED', '재상신', 'info', 'filled', 'PENDING'],
    ['SUBMISSION_CANCELED', '결재신청 취소', 'error', 'outlined', 'DRAFT'],
    ['APPROVAL_CANCELED', '결재 승인 취소', 'error', 'outlined', 'DRAFT'],
    ['REJECTED', '반려', 'error', 'filled', 'REJECTED'],
    ['APPROVED', '승인', 'success', 'filled', 'COMPLETED'],
    ['COMPLETED', '완료', 'success', 'filled', 'COMPLETED'],
    ['RETURNED', '보완요청', 'warning', 'filled', 'REVISION_REQUESTED'],
  ] as const)('maps system event %s to the existing status colors', (eventType, label, color, variant, status) => {
    expect(getApprovalSystemEventPresentation(eventType)).toEqual({ label, color, variant });
    expect(getApprovalSystemEventPresentation(eventType)).toMatchObject({
      color: eventType.endsWith('_CANCELED')
        ? getApprovalStatusPresentation('REJECTED').color
        : getApprovalStatusPresentation(status).color,
      variant: getApprovalStatusPresentation(status).variant,
    });
  });

  it.each(['DELETED', 'UNKNOWN', 'toString', ''])(
    'preserves the existing display for unsupported event %s',
    (eventType) => {
      expect(getApprovalSystemEventPresentation(eventType)).toBeUndefined();
    },
  );

  it.each([
    ['DRAFT', '임시저장', 'default', 'outlined'],
    ['PENDING', '결재진행중', 'info', 'filled'],
    ['IN_PROGRESS', '결재진행중', 'info', 'filled'],
    ['COMPLETED', '승인', 'success', 'filled'],
    ['REJECTED', '반려', 'error', 'filled'],
    ['REVISION_REQUESTED', '보완요청', 'warning', 'filled'],
  ] as const)('maps %s to its canonical status badge', (status, label, color, variant) => {
    expect(getApprovalStatusPresentation(status)).toEqual({ label, color, variant });
  });

  it.each([
    ['DRAFTING', '기안', 'primary'],
    ['BUSINESS_CONTACT', '업무', 'info'],
    ['EXPENSE_RESOLUTION', '지출', 'warning'],
    ['ATTENDANCE_APPLICATION', '근태', 'secondary'],
  ] as const)('maps %s to its canonical document-kind badge', (kind, label, color) => {
    expect(getDocumentKindPresentation(kind)).toEqual({ label, color });
  });
});
