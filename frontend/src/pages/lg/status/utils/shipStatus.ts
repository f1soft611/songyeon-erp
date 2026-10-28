import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 물류관리 > 출하현황 (송연 LG0003). 출하확정된 기록(출하등록 줄 · 물류출고일이 적힌 생산확정 줄)
export type ShipStatusRecord = {
  id: number;
  scheduleType: 'logistics' | 'production';
  scheduleDate?: string | null; // 출고일
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null; // 실제로 나간 양
  vehicle?: string | null;
  packingMethod?: string | null;
  shipNote?: string | null;
  visitOrder?: number | null;
  driverName?: string | null;
  storage?: string | null;
  carriedOver?: boolean; // 금액만 다른 때로 넘긴(이월) 건
  carryoverQty?: number;
  carryoverLabel?: string; // '이월(2026-10-05, 2026-11)' — 서버가 만든 글자
};

// 두 곳(출하등록·생산확정)의 id 가 겹칠 수 있어 출처를 붙여 줄 열쇠로 쓴다
// 2026-10-26 출하량은 숫자 칸(서버는 글자로 준다. 예전 '1,500kg' 모양도 숫자만 골라 읽는다)
export type ShipStatusRow = Omit<ShipStatusRecord, 'orderQty'> & { key: string; orderQty: number | null };
export const toStatusRow = (record: ShipStatusRecord): ShipStatusRow => ({
  ...record, key: `${record.scheduleType}:${record.id}`, orderQty: qtyNumber(record.orderQty),
});

export const qtyNumber = (value: unknown): number | null => {
  const text = String(value ?? '').replace(/[^0-9.]/g, '');
  const number = text === '' ? NaN : Number(text);
  return Number.isFinite(number) ? number : null;
};

// 현재고와 같이 천 단위 쉼표, 소수는 둘째 자리까지. 없으면 빈칸(S_ERP 표준)
export const qtyText = (value: number | null) =>
  value == null ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export type ShipStatusQuery = { start: string; end: string; productName: string; clientName: string };

export const statusQueryString = (query: ShipStatusQuery) => {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.productName.trim()) params.set('productName', query.productName.trim());
  if (query.clientName.trim()) params.set('clientName', query.clientName.trim());
  return params.toString();
};

// 비면 빈칸(S_ERP 표준, 송연은 '-')
export const dash = (value: unknown) => (value == null || value === '' ? '' : String(value));

// 비고: 이월 건만 꼬리표
export const carryoverText = (row: Pick<ShipStatusRecord, 'carriedOver' | 'carryoverLabel'>) => (row.carriedOver ? row.carryoverLabel || '이월' : '');

export const statusExcelName = (query: ShipStatusQuery) => `출하현황_${query.start}~${query.end}.xlsx`;

// 송연 엑셀 칸
export const SHIP_STATUS_EXCEL_COLUMNS: ExcelColumn<ShipStatusRecord>[] = [
  { key: 'scheduleDate', label: '출고일', width: 12 },
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'productName', label: '품목명', width: 28 },
  { key: 'storage', label: '보관방법', width: 14 },
  { key: 'orderQty', label: '출하량', width: 10 },
  { key: 'vehicle', label: '배차', width: 14 },
  { key: 'driverName', label: '운행자', width: 10 },
  { key: 'visitOrder', label: '순서', width: 8 },
  { key: 'packingMethod', label: '포장방법', width: 12 },
  { key: 'shipNote', label: '특이사항', width: 20 },
  { key: (row) => carryoverText(row), label: '비고', width: 22 },
];
