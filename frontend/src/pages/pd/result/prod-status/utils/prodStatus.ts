import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { ProdStatusQuery, ProdStatusRow } from '../types/prodStatus.types';

// 생산관리 > 생산실적 > 생산현황 화면 규칙(송연 PD0003). 생산입고(실생산량이 적힌) 기록을 기간으로 본다.

export const statusQueryString = (query: ProdStatusQuery) => {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.productName.trim()) params.set('productName', query.productName.trim());
  if (query.clientName.trim()) params.set('clientName', query.clientName.trim());
  return params.toString();
};

// 비고가 비면 빈칸(S_ERP 표준, 송연은 '-')
export const noteText = (note?: string | null) => (note && note.trim() ? note : '');

export const statusExcelName = (query: ProdStatusQuery) => `생산현황_${query.start}~${query.end}.xlsx`;

// 송연 엑셀 칸
export const STATUS_EXCEL_COLUMNS: ExcelColumn<ProdStatusRow>[] = [
  { key: 'scheduleDate', label: '생산일', width: 12 },
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '생산지시량', width: 12 },
  { key: 'actualQty', label: '실생산량', width: 12 },
  { key: 'note', label: '비고', width: 30 },
];
