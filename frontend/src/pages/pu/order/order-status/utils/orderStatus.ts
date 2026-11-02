import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { PurchaseOrder } from '../../order-register/types/purchaseOrder.types';
import type { StatusRow } from '../types/orderStatus.types';

// 구매관리 > 발주관리 > 발주현황 화면 규칙(송연 38-po-status.js): 기간 안에 낸 발주를 한 줄씩 본다.
// 금액칸이 없는 대신 들어왔는지를 보여준다. 발주해놓고 안 들어온 것을 찾는 것이 이 표의 주 쓰임이다.

// 아무것도 고르지 않았을 때의 차례: 최근 날짜가 위, 같은 날 안에서는 거래처끼리 붙여둔다, 그 안에서 품목 이름 순
export function sortStatus(rows: PurchaseOrder[]): PurchaseOrder[] {
  return [...rows].sort((a, b) =>
    (b.orderDate || '').localeCompare(a.orderDate || '')
    || (a.clientName || '').localeCompare(b.clientName || '')
    || (a.materialName || '').localeCompare(b.materialName || ''));
}

// 거래처 칸에 같은 날 같은 거래처의 건수를 붙이려고 센다(송연 '대한상사 3건')
export function toStatusRows(rows: PurchaseOrder[]): StatusRow[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = `${row.orderDate}|${row.clientName}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return sortStatus(rows).map((row) => ({ ...row, clientCount: counts.get(`${row.orderDate}|${row.clientName}`) ?? 1 }));
}

export function statusCounts(rows: PurchaseOrder[]) {
  const done = rows.filter((row) => row.received).length;
  return {
    count: rows.length,
    clients: new Set(rows.map((row) => row.clientName).filter(Boolean)).size,
    pending: rows.length - done,
    done,
  };
}

// 송연 발주현황 엑셀(화면 차례 그대로)
export const STATUS_EXCEL_COLUMNS: ExcelColumn<PurchaseOrder>[] = [
  { key: 'orderDate', label: '발주일자', width: 12 },
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'materialName', label: '발주품목', width: 28 },
  { key: 'materialCode', label: '품목코드', width: 12 },
  { key: 'qty', label: '수량', width: 10 },
  { key: (row) => (row.received ? '입고완료' : '미입고'), label: '입고여부', width: 10 },
];

// 이번 달 1일(송연 posSetDefaultDates)
export const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
