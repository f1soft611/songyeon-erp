import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { formatMoney, formatQty } from '../../register/utils/salesRegister';

// 판매관리 > 판매현황 (송연 sales.py GET /api/sales · 36-sales.js loadSalesStatus)
// 적어둔 판매만 본다 — 줄마다 지울 수 있는 관리 화면이라서다.
export type SaleRow = {
  id: number;
  saleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  qty?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
  note?: string | null;
  sourceType?: string | null;
  createdBy?: string | null;
  sourceLabel?: string | null; // 직접등록 · 출하확정
};
export type SalesStatus = { rows: SaleRow[]; count: number; totalQty: number; totalAmount: number; noPriceCount: number };
export type SalesQuery = { start: string; end: string; clientName: string; productName: string };

export const salesQueryString = (query: SalesQuery) => {
  const params = new URLSearchParams({ start: query.start, end: query.end });
  if (query.clientName.trim()) params.set('clientName', query.clientName.trim());
  if (query.productName.trim()) params.set('productName', query.productName.trim());
  return params.toString();
};

// 금액이 빈 줄이 있으면 알려준다. 합계만 보면 '적게 팔렸네' 로 읽히는데, 실은 단가가 없어서 안 더해진 것일 수 있다.
export const statusSummary = (data: SalesStatus) =>
  `${data.count}건 · 수량 ${formatQty(data.totalQty)} · 금액 ${formatMoney(data.totalAmount)}원`
  + (data.noPriceCount > 0 ? ` (단가 없는 줄 ${data.noPriceCount}건은 금액에 안 들어갔어요)` : '');

// 송연 todayFileTag: 20261007
export const todayFileTag = (date = new Date()) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

// 송연 엑셀 칸
export const SALES_STATUS_EXCEL_COLUMNS: ExcelColumn<SaleRow>[] = [
  { key: 'saleDate', label: '판매일자', width: 12 },
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'productName', label: '품목명', width: 28 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'unitPrice', label: '단가', width: 12 },
  { key: 'amount', label: '금액', width: 14 },
  { key: 'sourceLabel', label: '들어온곳', width: 10 },
  { key: 'note', label: '메모', width: 20 },
];
