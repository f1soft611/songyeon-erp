// 판매관리 > 판매등록 (송연 sales.py · 36-sales.js, 2026-09-09 관리부 요청)
// 출하확정된 것을 끌어와 판매로 남기거나, 출하 없이 판 것을 직접 적는다. 한 번 적으면 출하 쪽이 바뀌어도 그대로 남는다.
export type ShippableRecord = {
  sourceType: 'logistics' | 'production';
  sourceId: number;
  saleDate?: string | null; // 출고일 = 판매일자
  clientName?: string | null;
  productName?: string | null;
  qty?: number | null;
  unitPrice?: number | null; // 판매단가(없으면 비어 있다)
  amount?: number | null;
  already?: boolean; // 이미 판매로 들어간 건
};
export type ShippableList = { rows: ShippableRecord[]; pendingCount: number };
export type ShippableRow = ShippableRecord & { key: string };
export type PullResult = { added: number; skipped: number };

// 출하등록과 생산확정의 id 가 겹칠 수 있어 출처를 붙여 줄 열쇠로 쓴다
export const toShippableRow = (record: ShippableRecord): ShippableRow => ({ ...record, key: `${record.sourceType}:${record.sourceId}` });

// 송연 fmt / fmtPrice(금액·단가는 소수 넷째 자리까지)
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const formatMoney = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : (Math.round(value * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

// 상태 칸: 이미 넣은 건 / 단가가 없어 금액이 비는 건
export const statusOf = (row: ShippableRecord): 'already' | 'no-price' | '' =>
  (row.already ? 'already' : row.unitPrice == null ? 'no-price' : '');

export const summaryText = (rows: ShippableRecord[]) =>
  (rows.length === 0 ? '' : `${rows.length}건 중 아직 안 넣은 것 ${rows.filter((row) => !row.already).length}건`);

// 체크한 줄 중 아직 안 넣은 것만 보낸다(이미 넣은 줄은 체크해도 서버가 건너뛴다)
export const pullItems = (rows: ShippableRecord[]) =>
  rows.filter((row) => !row.already).map((row) => ({ sourceType: row.sourceType, sourceId: row.sourceId }));

// 건너뛴 것이 있으면 조용히 넘기지 않는다 — 화면을 열어둔 사이에 다른 사람이 먼저 넣었거나 출하가 취소됐을 수 있다
export const pullMessage = (result: PullResult) =>
  (result.skipped > 0 ? `${result.added}건 등록, ${result.skipped}건은 건너뛰었어요` : `${result.added}건을 판매로 넣었어요`);

// 송연 salesMonthStart: 이번 달 1일
export const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

export type ManualSaleForm = { saleDate: string; clientName: string; productName: string; qty: string; unitPrice: string; note: string };

export const toManualBody = (form: ManualSaleForm) => ({
  saleDate: form.saleDate,
  clientName: form.clientName.trim(),
  productName: form.productName.trim(),
  qtyText: form.qty.trim(),
  unitPriceText: form.unitPrice.trim(),
  note: form.note.trim(),
});
