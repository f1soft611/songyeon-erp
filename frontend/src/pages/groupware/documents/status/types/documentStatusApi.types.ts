import type { DocumentStatusRow } from './documentStatus.types';

export type DocumentStatusPageResponse = {
  resultList: DocumentStatusRow[];
  totalRowCount: number;
};

export type DocumentStatusResult = {
  rows: DocumentStatusRow[];
  totalRowCount: number;
};
