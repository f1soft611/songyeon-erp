import { describe, expect, it } from 'vitest';
import type { F1GridColumn } from '../src/shared/components/f1-grid';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';

type SearchRow = {
  name: string;
  amount: number;
  createdAt: string;
  status: string;
};

describe('toPageSearchFields', () => {
  it('converts column types and keeps search.span independent from form.span', () => {
    const columns: F1GridColumn<SearchRow>[] = [
      {
        field: 'name',
        headerName: '이름',
        form: { span: 3 },
        search: { label: '검색 이름', group: '기본', order: 2, span: 5 },
      },
      {
        field: 'amount',
        headerName: '금액',
        type: 'number',
        search: { order: 1 },
      },
      {
        field: 'createdAt',
        headerName: '생성일',
        type: 'date',
        search: { order: 3, span: 3 },
      },
      {
        field: 'status',
        headerName: '상태',
        type: 'select',
        search: { order: 4 },
        options: [
          { value: 'Y', label: '사용' },
          { value: 'N', label: '미사용' },
        ],
      },
    ];

    expect(toPageSearchFields(columns)).toEqual([
      {
        field: 'amount',
        label: '금액',
        type: 'number',
        searchSpan: 1,
      },
      {
        field: 'name',
        label: '검색 이름',
        type: 'text',
        searchSpan: 5,
        group: '기본',
      },
      {
        field: 'createdAt',
        label: '생성일',
        type: 'date',
        searchSpan: 3,
      },
      {
        field: 'status',
        label: '상태',
        type: 'select',
        searchSpan: 1,
        options: [
          { value: 'Y', label: '사용' },
          { value: 'N', label: '미사용' },
        ],
      },
    ]);
  });
});
