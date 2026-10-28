import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type DocumentStatusSearchValues = Record<string, PageSearchFieldValue>;

export type DocumentStatusSearchSession = {
  keyword: string;
  detailValues: DocumentStatusSearchValues;
};
