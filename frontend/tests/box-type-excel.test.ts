import { describe, expect, it } from 'vitest';
import { BOX_TYPE_EXCEL_COLUMNS } from '../src/pages/co/master/box-type/utils/boxTypeExcel';

describe('포장유형 엑셀 다운로드 칸', () => {
  it('그리드와 같은 차례(코드 · 마진(원)은 그리드에서 빼서 넣지 않음), 사용여부는 글자로', () => {
    expect(BOX_TYPE_EXCEL_COLUMNS.map((c) => c.label)).toEqual([
      '포장유형', '고정마진율(%)', '로스율(%)', '인건비(원)', '포장비(원)', '물류비(원)', '사용여부', '등록자', '등록일시', '수정자', '수정일시',
    ]);
    const useCol = BOX_TYPE_EXCEL_COLUMNS.find((c) => c.label === '사용여부');
    expect(typeof useCol?.key).toBe('function');
    const key = useCol?.key as (row: { useYn: string }) => unknown;
    expect(key({ useYn: 'N' })).toBe('사용안함');
    expect(key({ useYn: 'Y' })).toBe('사용중');
  });
});
