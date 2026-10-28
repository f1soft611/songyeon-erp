import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { AttachmentFile } from '../../../../shared/services/attachment.service';

// 구매관리 > 입고관리 (송연 app.py /api/materials/receiving · 19-purchase.js · 37-recv-status.js)
// 반품은 '마이너스 입고' 다 — 수량·금액이 음수인 줄로 같은 표에 들어가 합계·재고가 저절로 맞는다.
export type Receiving = {
  id: number;
  materialCode?: string | null;
  materialName?: string | null;
  qty?: number | null;
  receiveDate?: string | null;
  clientName?: string | null;
  unitPrice?: number | null;
  supplyAmount?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  taxType?: string | null;
  barcode?: string | null;
  isReturn?: number | null;
  returnReason?: string | null;
  returnOfId?: number | null;
  returnedQty?: number | null;
  returnableQty?: number | null;
  files?: AttachmentFile[];
};

export type ReceivingSummary = { materialCode: string; materialName?: string | null; totalQty?: number | null; entryCount?: number | null };
export type ReceivingDetail = {
  rows: { date?: string | null; materialName?: string | null; qty?: number | null; clientName?: string | null }[];
  totalReceived: number;
  totalUsed: number;
};

export type TaxType = '과세' | '면세' | '영세';
export const TAX_TYPES: TaxType[] = ['과세', '면세', '영세'];
// 과세구분별 부가세율. 면세·영세는 부가세가 붙지 않는다(서버와 같은 값)
const VAT_RATE: Record<string, number> = { 과세: 0.1, 면세: 0, 영세: 0 };

// 송연 fmt / fmtPrice
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const formatMoney = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : (Math.round(value * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

export const isReturnRow = (row: Receiving) => Boolean(row.isReturn);

// ===== 입고·반품 등록 창의 한 줄 =====
export type StagingItem = {
  key: number;
  materialCode: string;
  materialName: string;
  qty: number | string; // 반품은 칸에서 고친다
  unitPrice: number | string | null;
  taxType: TaxType;
  clientName: string;
  checked: boolean;
  poId?: number | null; // 발주에서 가져온 품목
  returnOfId?: number | null; // 반품할 입고
  maxQty?: number | null; // 반품가능 수량
  returnReason?: string;
};

// 한 품목의 공급가액·부가세·합계(송연 recvItemCalc). 단가나 수량이 없으면 비운다.
export function itemCalc(item: Pick<StagingItem, 'unitPrice' | 'qty' | 'taxType'>) {
  const unitPrice = parseFloat(String(item.unitPrice ?? ''));
  const qty = parseFloat(String(item.qty ?? ''));
  if (!unitPrice || !qty) return { supply: null, vat: null, total: null } as const;
  const supply = Math.round(unitPrice * qty);
  const vat = Math.round(supply * (VAT_RATE[item.taxType] ?? 0.1));
  return { supply, vat, total: supply + vat };
}

// 합계 직접입력 → 단가 역산(송연과 같이 부가세 10% 기준: 공급가액 = 합계 / 1.1, 단가는 소수 넷째 자리)
export function unitPriceFromTotal(totalText: string, qty: number | string): number | '' | null {
  const raw = totalText.trim();
  if (raw === '') return '';
  const total = parseFloat(raw);
  const q = parseFloat(String(qty));
  if (Number.isNaN(total) || !q) return null; // 그대로 둔다
  const supply = Math.round(total / 1.1);
  return Math.round((supply / q) * 10000) / 10000;
}

export const stagingTotal = (items: StagingItem[]) =>
  items.filter((item) => item.checked).reduce((sum, item) => sum + (itemCalc(item).total || 0), 0);

// 원재료BOM 단가와 다른가(원 단위로 비교, 송연과 같음)
export function priceDiffers(unitPrice: number | string | null, bomPrice: number | null | undefined) {
  const price = parseFloat(String(unitPrice ?? ''));
  return Boolean(price && bomPrice != null && Math.round(price) !== Math.round(bomPrice));
}

export const hasNoPrice = (item: StagingItem) =>
  item.unitPrice === null || item.unitPrice === '' || item.unitPrice === undefined || Number.isNaN(parseFloat(String(item.unitPrice)));

// 입고 확정 전 단가 확인 문구(단가 없음 → 막음, BOM 단가와 다름 → 물어봄)
export function noPriceMessage(items: StagingItem[]) {
  const missing = items.filter(hasNoPrice);
  if (missing.length === 0) return null;
  return `단가를 적어야 등록할 수 있어요.\n\n${missing.map((item) => `· ${item.materialName}`).join('\n')}\n\n단가를 모르면 합계금액만 적어도 단가가 자동으로 역산돼요.`;
}

export function priceMismatchMessage(items: StagingItem[], bomPriceOf: (code: string) => number | null | undefined) {
  const lines = items
    .filter((item) => !hasNoPrice(item) && priceDiffers(item.unitPrice, bomPriceOf(item.materialCode)))
    .map((item) => `· ${item.materialName}: 입력단가 ${formatMoney(parseFloat(String(item.unitPrice)))}원 / 원재료BOM단가 ${formatMoney(bomPriceOf(item.materialCode) ?? null)}원`);
  return lines.length ? `원재료BOM에 등록된 단가와 다른 품목이 있어요.\n\n${lines.join('\n')}\n\n그대로 진행할까요?` : null;
}

// 반품 확정 전 검사(수량 없음·남은 수량 넘음)
export function returnQtyError(items: StagingItem[]) {
  const bad = items.filter((item) => !(parseFloat(String(item.qty)) > 0));
  if (bad.length) return `반품수량을 적어주세요 — ${bad.map((item) => item.materialName).join(', ')}`;
  const over = items.filter((item) => item.maxQty != null && parseFloat(String(item.qty)) > item.maxQty + 1e-9);
  if (over.length) return over.map((item) => `${item.materialName}은(는) ${formatQty(item.maxQty)}까지만 반품할 수 있어요`).join(' / ');
  return null;
}

export const toBulkBody = (receiveDate: string, items: StagingItem[], isReturn: boolean) => ({
  receiveDate,
  isReturn,
  items: items.map((item) => ({
    materialCode: item.materialCode,
    clientName: item.clientName,
    qty: String(item.qty),
    unitPrice: item.unitPrice == null ? null : String(item.unitPrice),
    poId: item.poId ?? null,
    taxType: item.taxType || '과세',
    returnReason: item.returnReason ?? null,
    returnOfId: item.returnOfId ?? null,
    key: String(item.key),
  })),
});

// ===== 입고현황 탭: 같은 날 같은 거래처는 한 덩어리, 덩어리마다 소계 =====
export type InStatusRow = Receiving & { groupKey: string; groupCount: number; subtotal: number | null };

// 아무것도 고르지 않았을 때의 차례: 최근 날짜 → 거래처 → 품목
export function sortInStatus(rows: Receiving[]): Receiving[] {
  return [...rows].sort((a, b) =>
    (b.receiveDate || '').localeCompare(a.receiveDate || '')
    || (a.clientName || '').localeCompare(b.clientName || '')
    || (a.materialName || '').localeCompare(b.materialName || ''));
}

// 덩어리 소계: 모든 줄에 단가가 없으면 0 이 아니라 비운다(0 은 '0원어치' 로 읽힌다)
export function toInStatusRows(rows: Receiving[]): InStatusRow[] {
  const sorted = sortInStatus(rows);
  const groups = new Map<string, Receiving[]>();
  sorted.forEach((row) => {
    const key = `${row.receiveDate}|${row.clientName}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return sorted.map((row) => {
    const key = `${row.receiveDate}|${row.clientName}`;
    const part = groups.get(key) ?? [];
    const subtotal = part.every((x) => x.totalAmount == null) ? null : part.reduce((sum, x) => sum + (x.totalAmount || 0), 0);
    return { ...row, groupKey: key, groupCount: part.length, subtotal };
  });
}

export const sumOf = (rows: Receiving[], key: 'supplyAmount' | 'vatAmount' | 'totalAmount') =>
  rows.reduce((sum, row) => sum + (row[key] || 0), 0);

export const noPriceRows = (rows: Receiving[]) => rows.filter((row) => row.totalAmount == null).length;

// ===== 서류등록 탭: 품목별로 묶어 서류를 붙이고 빠진 것을 찾는다 =====
export const rowsOfMaterial = (rows: Receiving[], code: string) => rows.filter((row) => String(row.materialCode) === String(code));
export const filesOfMaterial = (rows: Receiving[], code: string) =>
  rowsOfMaterial(rows, code).flatMap((row) => (row.files || []).map((file) => ({ ...file, receiveDate: row.receiveDate })));

// 이번 달 1일
export const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

const materialWithCode = (row: Receiving) => `${row.materialName || ''} (${row.materialCode || ''})`;
export { materialWithCode };

// ===== 엑셀(송연과 같은 칸) =====
export const HISTORY_EXCEL_COLUMNS: ExcelColumn<Receiving>[] = [
  { key: 'clientName', label: '거래처', width: 18 },
  { key: 'materialName', label: '원재료명', width: 26 },
  { key: 'materialCode', label: '원재료코드', width: 12 },
  { key: 'barcode', label: '바코드', width: 18 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'taxType', label: '과세구분', width: 9 },
  { key: 'unitPrice', label: '단가', width: 11 },
  { key: 'supplyAmount', label: '공급가액', width: 12 },
  { key: 'vatAmount', label: '부가세', width: 11 },
  { key: 'totalAmount', label: '합계', width: 12 },
  { key: (row) => (row.files || []).map((file) => file.origName).join(' / '), label: '첨부서류', width: 30 },
];

export const RETURN_EXCEL_COLUMNS: ExcelColumn<Receiving>[] = [
  { key: 'receiveDate', label: '반품일', width: 12 },
  { key: 'clientName', label: '거래처', width: 18 },
  { key: 'materialName', label: '원재료명', width: 26 },
  { key: 'materialCode', label: '원재료코드', width: 12 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'taxType', label: '과세구분', width: 9 },
  { key: 'unitPrice', label: '단가', width: 11 },
  { key: 'supplyAmount', label: '공급가액', width: 12 },
  { key: 'vatAmount', label: '부가세', width: 11 },
  { key: 'totalAmount', label: '합계', width: 12 },
  { key: 'returnReason', label: '사유', width: 16 },
];

export const IN_STATUS_EXCEL_COLUMNS: ExcelColumn<Receiving>[] = [
  { key: 'receiveDate', label: '입고일자', width: 12 },
  { key: 'clientName', label: '거래처', width: 18 },
  { key: 'materialName', label: '입고품목', width: 26 },
  { key: 'materialCode', label: '품목코드', width: 12 },
  { key: 'qty', label: '수량', width: 10 },
  { key: 'taxType', label: '과세구분', width: 9 },
  { key: 'unitPrice', label: '단가', width: 11 },
  { key: 'supplyAmount', label: '공급가액', width: 12 },
  { key: 'vatAmount', label: '부가세', width: 11 },
  { key: 'totalAmount', label: '합계금액', width: 12 },
  { key: (row) => (row.isReturn ? '반품' : '입고'), label: '구분', width: 8 },
];

export const DOC_EXCEL_COLUMNS: ExcelColumn<ReceivingSummary>[] = [
  { key: 'materialName', label: '원재료', width: 26 },
  { key: 'entryCount', label: '입고건수', width: 10 },
  { key: 'totalQty', label: '총입고수량', width: 12 },
];
