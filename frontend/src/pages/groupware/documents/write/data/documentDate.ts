export type DocumentDateSourceLabel = '상신일' | '수정일' | '작성일';

export type DocumentDateFields = {
  submittedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export function getDocumentDisplayDate(
  fields: DocumentDateFields,
): { value: string; sourceLabel?: DocumentDateSourceLabel } {
  if (fields.submittedAt) {
    return { value: fields.submittedAt, sourceLabel: '상신일' };
  }
  if (fields.updatedAt) {
    return { value: fields.updatedAt, sourceLabel: '수정일' };
  }
  if (fields.createdAt) {
    return { value: fields.createdAt, sourceLabel: '작성일' };
  }
  return { value: '' };
}
