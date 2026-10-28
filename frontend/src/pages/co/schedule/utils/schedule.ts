import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { parseQtyNumber } from '../../../sales/order/order-register/utils/salesOrder';
import type { LogisticsScheduleRow, ProductionScheduleRow } from '../types/schedule.types';

// 공통관리 > 생산스케줄(송연 CM0002)·물류스케줄(CM0003). 날짜 하루치를 보기만 하는 화면의 규칙(합계 · 상태 · 엑셀 칸). 줄 모양은 types/schedule.types

// 표 아래 합계: 건수 · 수량 합(kg)
export function scheduleSummary(rows: { orderQty?: string | null }[]): { count: number; total: number } {
  return { count: rows.length, total: rows.reduce((sum, row) => sum + parseQtyNumber(row.orderQty || ''), 0) };
}

export const formatKg = (value: number): string =>
  `${value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}kg`;

// 송연 물류스케줄 상태 칸: 생산연동 줄은 '생산연동', 나머지는 실출하량이 있으면 출하완료
export function logisticsStatus(row: LogisticsScheduleRow): '생산연동' | '출하완료' | '출하대기' {
  if (row.source === 'production') return '생산연동';
  return row.shipped ? '출하완료' : '출하대기';
}

// 송연 엑셀: 생산량은 실생산량이 있으면 그것, 없으면 생산지시량
export const PRODUCTION_EXCEL_COLUMNS: ExcelColumn<ProductionScheduleRow>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: (row) => row.actualQty || row.orderQty || '', label: '생산량', width: 12 },
  { key: 'note', label: '비고', width: 20 },
];

// 송연 엑셀: 상태는 출하완료/출하대기(생산연동 줄도 실출하량 기준)
export const LOGISTICS_EXCEL_COLUMNS: ExcelColumn<LogisticsScheduleRow>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '수량', width: 12 },
  { key: 'note', label: '비고', width: 20 },
  { key: (row) => (row.shipped ? '출하완료' : '출하대기'), label: '상태', width: 10 },
];
