import { describe, expect, it } from 'vitest';

import { ACC_REPORTS, REPORT_EXCEL_COLUMNS, reportFileName, type CashReport } from '../src/pages/ha/accio/utils/accIo';

describe('입·출금관리(송연 33-acc-cash.js 174~302)', () => {
  it('탭마다 이름 · 안내 · 색만 다르다', () => {
    expect(ACC_REPORTS.입금.tab).toBe('입금관리');
    expect(ACC_REPORTS.출금.tab).toBe('출금관리');
    expect(ACC_REPORTS.입금.meta).toBe('기간 안에 들어온 돈을 계정과목별·거래처별로 묶어서 봐요');
    expect(ACC_REPORTS.출금.meta).toBe('기간 안에 나간 돈을 계정과목별·거래처별로 묶어서 봐요');
  });

  it('엑셀: 조회한 구분 · 기간으로 파일 이름, 칸', () => {
    const r = { kind: '출금', start: '2026-10-01', end: '2026-10-31' } as CashReport;
    expect(reportFileName(r)).toBe('출금관리_2026-10-01_2026-10-31.xlsx');
    expect(REPORT_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['날짜', '거래처', '계정코드', '계정과목', '금액', '수단', '비고']);
  });
});
