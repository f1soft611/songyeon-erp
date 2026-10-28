// 인사·회계 > 세금계산서 (송연 12-tax-invoice.js · app.py /api/tax-invoice/* · accounting.py /api/accounting/sales-by-client)
// 거래처 요청이 오면 즉시 발행하거나, 월단위로 한번에 일괄발행한다. 발행 금액은 매출·매입관리와 같은 매출(확정 출하 × 판매단가)이다.

export type TaxSingleRow = {
  date: string | null; clientName: string; itemName: string; qty: number | null; unitPrice: number | null; amount: number | null; carriedOver: boolean;
};
export type TaxSingle = { rows: TaxSingleRow[]; totalAmount: number; totalQty: number; resolvedClientName: string };
export type TaxBatchClient = { clientName: string; qty: number; amount: number; hasMissingPrice: boolean };
export type TaxBatch = { clients: TaxBatchClient[]; totalAmount: number };

// 송연 fmt(수량) / fmtPrice(금액)
export const taxQty = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
export const taxMoney = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : (Math.round(v * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 }));

// 일괄발행: 고른 거래처의 매출액 합
export const pickedTotal = (clients: TaxBatchClient[], picked: string[]) => {
  const set = new Set(picked);
  return clients.filter((c) => set.has(c.clientName)).reduce((sum, c) => sum + (c.amount || 0), 0);
};
// '전체선택' 은 다 골라져 있으면 모두 풀고, 아니면 모두 고른다
export const toggleAll = (clients: TaxBatchClient[], picked: string[]) =>
  (clients.length > 0 && clients.every((c) => picked.includes(c.clientName)) ? [] : clients.map((c) => c.clientName));
