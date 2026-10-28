import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 생산관리 > 생산현황 (송연 PD0003). 생산입고(실생산량이 적힌) 기록을 기간으로 본다. 수량은 '980kg' 처럼 단위가 붙은 글자다.
export type StatusRecord = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  note?: string | null;
};

export type StatusQuery = { start: string; end: string; productName: string; clientName: string };

export const statusQueryString = (query: StatusQuery) => {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.productName.trim()) params.set('productName', query.productName.trim());
  if (query.clientName.trim()) params.set('clientName', query.clientName.trim());
  return params.toString();
};

// 비고가 비면 빈칸(S_ERP 표준, 송연은 '-')
export const noteText = (note?: string | null) => (note && note.trim() ? note : '');

export const statusExcelName = (query: StatusQuery) => `생산현황_${query.start}~${query.end}.xlsx`;

// 송연 엑셀 칸
export const STATUS_EXCEL_COLUMNS: ExcelColumn<StatusRecord>[] = [
  { key: 'scheduleDate', label: '생산일', width: 12 },
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '생산지시량', width: 12 },
  { key: 'actualQty', label: '실생산량', width: 12 },
  { key: 'note', label: '비고', width: 30 },
];
