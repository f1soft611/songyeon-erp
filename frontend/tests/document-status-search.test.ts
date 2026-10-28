import { describe, expect, it } from 'vitest';
import {
  cloneDetailValues,
  isDocumentStatusSearchSession,
  toDocumentStatusFilters,
} from '../src/pages/groupware/documents/status/services/documentStatusSearch';
import type { DocumentStatusSearchValues } from '../src/pages/groupware/documents/status/types/documentStatusSearch.types';

describe('document status search helpers', () => {
  it('maps trimmed inputs and date ranges to the existing filter names', () => {
    expect(toDocumentStatusFilters(' plan ', {
      electronicApprovalId: 41,
      title: ' Annual ',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      drafterName: ' Morgan ',
      drafterDepartmentName: ' Finance ',
      participantName: ' Sam ',
      myParticipantType: 'DRAFTER',
      myActionStatus: 'APPROVED',
      currentApprovalStep: ' Alex ',
      submittedAt: { from: ' 2026-09-20 ', to: '2026-10-20' },
      updatedAt: { from: '2026-10-01', to: '' },
    })).toEqual({
      keyword: 'plan',
      electronicApprovalId: '41',
      title: 'Annual',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      drafterName: 'Morgan',
      drafterDepartmentName: 'Finance',
      participantName: 'Sam',
      myParticipantType: 'DRAFTER',
      myActionStatus: 'APPROVED',
      currentApproverName: 'Alex',
      submittedAtFrom: '2026-09-20',
      submittedAtTo: '2026-10-20',
      updatedAtFrom: '2026-10-01',
    });
  });

  it('omits blank values and invalid enum values', () => {
    expect(toDocumentStatusFilters(' ', {
      title: false,
      documentType: 'invalid',
      documentStatus: 'invalid',
      myParticipantType: 'invalid',
      myActionStatus: 'invalid',
      submittedAt: '',
      updatedAt: { from: '', to: ' ' },
    })).toEqual({});
  });

  it('clones date ranges so editing inputs cannot mutate the applied session', () => {
    const values: DocumentStatusSearchValues = {
      title: 'Plan',
      submittedAt: { from: '2026-09-20', to: '2026-10-20' },
    };
    const snapshot = cloneDetailValues(values);
    expect(snapshot).toEqual(values);
    expect(snapshot).not.toBe(values);
    expect(snapshot.submittedAt).not.toBe(values.submittedAt);
    values.submittedAt = { from: '2026-01-01' };
    expect(snapshot.submittedAt).toEqual({
      from: '2026-09-20', to: '2026-10-20',
    });
  });

  it('validates saved sessions without accepting malformed values', () => {
    expect(isDocumentStatusSearchSession({
      keyword: '', detailValues: { title: '', submittedAt: { from: '' } },
    })).toBe(true);
    for (const value of [
      null, [], { keyword: 1, detailValues: {} },
      { keyword: '', detailValues: [] },
      { keyword: '', detailValues: { title: Infinity } },
      { keyword: '', detailValues: { submittedAt: { from: 3 } } },
      { keyword: '', detailValues: { submittedAt: { unexpected: '' } } },
    ]) {
      expect(isDocumentStatusSearchSession(value)).toBe(false);
    }
  });
});
