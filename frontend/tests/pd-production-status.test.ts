import { describe, expect, it } from 'vitest';

import { STATUS_EXCEL_COLUMNS, noteText, statusExcelName, statusQueryString } from '../src/pages/pd/status/utils/productionStatus';

describe('생산현황 utils(송연 PD0003)', () => {
  it('조회 조건: 빈 품목명·거래처명은 보내지 않는다', () => {
    const query = { start: '2026-09-01', end: '2026-10-06', productName: ' 소스 ', clientName: '  ' };
    expect(Object.fromEntries(new URLSearchParams(statusQueryString(query)))).toEqual({ start: '2026-09-01', end: '2026-10-06', productName: '소스' });
    expect(statusExcelName(query)).toBe('생산현황_2026-09-01~2026-10-06.xlsx');
  });

  it('비고가 비면 빈칸 , 엑셀 칸은 송연과 같다', () => {
    expect(noteText(null)).toBe('');
    expect(noteText(' ')).toBe('');
    expect(noteText('야간')).toBe('야간');
    expect(STATUS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['생산일', '거래처', '품목명', '생산지시량', '실생산량', '비고']);
  });
});
