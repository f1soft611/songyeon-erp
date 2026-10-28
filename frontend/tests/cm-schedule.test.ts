import { describe, expect, it } from 'vitest';

import {
  formatKg,
  LOGISTICS_EXCEL_COLUMNS,
  logisticsStatus,
  PRODUCTION_EXCEL_COLUMNS,
  scheduleSummary,
} from '../src/pages/co/schedule/utils/schedule';
import { createProductionScheduleColumns } from '../src/pages/co/schedule/production-schedule/components/ProductionScheduleGrid';
import { createLogisticsScheduleColumns } from '../src/pages/co/schedule/logistics-schedule/components/LogisticsScheduleGrid';

describe('공통관리 생산스케줄·물류스케줄 utils', () => {
  it('합계: 건수와 수량 합(쉼표·단위가 섞여도 첫 숫자)', () => {
    expect(scheduleSummary([{ orderQty: '1,000kg' }, { orderQty: '150' }, { orderQty: null }])).toEqual({ count: 3, total: 1150 });
    expect(formatKg(1150)).toBe('1,150.00kg');
  });

  it('물류 상태: 생산연동 줄은 생산연동, 나머지는 실출하량이 있으면 출하완료', () => {
    expect(logisticsStatus({ id: 2, source: 'production', shipped: false })).toBe('생산연동');
    expect(logisticsStatus({ id: 3, source: 'manual', shipped: true })).toBe('출하완료');
    expect(logisticsStatus({ id: 4, source: 'manual', shipped: false })).toBe('출하대기');
  });

  it('엑셀 칸: 생산량은 실생산량이 있으면 그것, 물류 상태는 출하완료/출하대기(송연과 같음)', () => {
    expect(PRODUCTION_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '생산량', '비고']);
    const produced = PRODUCTION_EXCEL_COLUMNS[2].key as (row: object) => unknown;
    expect(produced({ id: 1, orderQty: '1000', actualQty: '980' })).toBe('980');
    expect(produced({ id: 1, orderQty: '1000', actualQty: '' })).toBe('1000');
    expect(LOGISTICS_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '수량', '비고', '상태']);
    const status = LOGISTICS_EXCEL_COLUMNS[4].key as (row: object) => unknown;
    expect(status({ id: 2, source: 'production', shipped: true })).toBe('출하완료');
    expect(status({ id: 3, source: 'manual', shipped: false })).toBe('출하대기');
  });
});

describe('공통관리 생산스케줄·물류스케줄 그리드(S_ERP 구조)', () => {
  it('칸: 맨 앞은 No(줄 번호), 보기 전용', () => {
    const production = createProductionScheduleColumns();
    expect(production.map((c) => c.headerName)).toEqual(['No', '거래처', '품목명(규격)', '생산지시량', '비고', '물류출고일']);
    expect(production[0].type).toBe('rownumber');
    expect(production.slice(1).every((c) => c.editable === false)).toBe(true);
    const logistics = createLogisticsScheduleColumns();
    expect(logistics.map((c) => c.headerName)).toEqual(['No', '거래처', '품목명(규격)', '출고량', '비고', '상태']);
    expect(logistics[0].type).toBe('rownumber');
    expect(logistics.slice(1).every((c) => c.editable === false)).toBe(true);
  });
});
