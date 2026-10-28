import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { PricingBomLine, PricingDetail, PricingRow } from '../services/pricing.service';

// 송연 단가관리 화면 규칙(SA0002Page · useSA0002 · SA0002PricingDetailModal 에서 옮김)

// 송연 matchesClient: 포함 관계 또는 공통 글자 비율 0.6 이상이면 같은 거래처로 본다
export function matchesClient(rowClient: string, typed: string): boolean {
  if (!typed) return true;
  if (!rowClient) return false;
  const a = rowClient.toLowerCase();
  const b = typed.toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;
  const setA = new Set(a);
  const setB = new Set(b);
  const common = [...setA].filter((ch) => setB.has(ch)).length;
  return common / Math.max(setA.size, setB.size, 1) >= 0.6;
}

// 차액금 = 현재단가 − 제품단가. 둘 중 하나라도 없으면 계산하지 않는다
export const diffOf = (row: Pick<PricingRow, 'currentPrice' | 'totalPrice'>): number | null =>
  row.currentPrice != null && row.totalPrice != null ? row.currentPrice - row.totalPrice : null;

export type DiffOption = '' | 'plus-desc' | 'plus-asc' | 'minus-desc' | 'minus-asc';
export const DIFF_OPTIONS: { value: DiffOption; label: string }[] = [
  { value: '', label: '차액금 전체' },
  { value: 'plus-desc', label: '초과 내림차순' },
  { value: 'plus-asc', label: '초과 오름차순' },
  { value: 'minus-desc', label: '미달 내림차순' },
  { value: 'minus-asc', label: '미달 오름차순' },
];

// 송연 renderTable: 거래처 필터 → 차액금 조건(초과/미달)과 정렬
export function filterPricingRows(rows: PricingRow[], client: string, diffOption: DiffOption): PricingRow[] {
  const typed = client.trim();
  let result = typed ? rows.filter((row) => matchesClient(row.clientName, typed)) : rows;
  if (diffOption) {
    const [kind, direction] = diffOption.split('-');
    result = result.filter((row) => {
      const diff = diffOf(row);
      return diff != null && (kind === 'plus' ? diff > 0 : diff < 0);
    });
    result = [...result].sort((a, b) =>
      direction === 'asc' ? (diffOf(a) as number) - (diffOf(b) as number) : (diffOf(b) as number) - (diffOf(a) as number));
  }
  return result;
}

// 송연 엑셀: 지금 표에 보이는 줄 그대로
export const PRICING_EXCEL_COLUMNS: ExcelColumn<PricingRow>[] = [
  { key: 'productCode', label: '제품코드' },
  { key: 'productName', label: '제품명' },
  { key: 'spec', label: '규격/단위' },
  { key: 'materialCost', label: '원재료비' },
  { key: 'laborCost', label: '인건비' },
  { key: 'packagingCost', label: '포장비' },
  { key: 'logisticsCost', label: '물류비' },
  { key: 'margin', label: '마진' },
  { key: 'totalPrice', label: '제품단가' },
  { key: 'currentPrice', label: '현재단가' },
  { key: 'clientName', label: '거래처' },
  { key: (row) => diffOf(row) ?? '', label: '차액금' },
];

// ===== 단가상세 창 =====
const t = (value: number | string | null | undefined) => (value == null ? '' : String(value));

export function pricingFormFrom(detail: PricingDetail) {
  return {
    productType: detail.productType,
    markupRate: t(detail.markupRate),
    lossRate: t(detail.lossRate),
    laborCost: t(detail.laborCost),
    packagingCost: t(detail.packagingCost),
    logisticsCost: t(detail.logisticsCost),
    margin: t(detail.margin),
    otherCost1: t(detail.otherCost1),
    otherCost1Note: detail.otherCost1Note,
    otherCost2: t(detail.otherCost2),
    otherCost2Note: detail.otherCost2Note,
    otherCost3: t(detail.otherCost3),
    otherCost3Note: detail.otherCost3Note,
    otherCost4: t(detail.otherCost4),
    otherCost4Note: detail.otherCost4Note,
    currentPrice: t(detail.currentPrice),
    clientName: detail.clientName,
  };
}
export type PricingForm = ReturnType<typeof pricingFormFrom>;

// 송연 reg-save 저장 본문 규칙: 금액은 빈 값·0 이면 null, 비율은 입력한 % 그대로(빈 값이면 null)
const amountOrNull = (value: string) => parseFloat(value) || null;
const rateOrNull = (value: string) => (value === '' ? null : parseFloat(value));
export function pricingSaveBody(form: PricingForm): Record<string, unknown> {
  return {
    productType: form.productType || null,
    markupRate: rateOrNull(form.markupRate),
    lossRate: rateOrNull(form.lossRate),
    laborCost: amountOrNull(form.laborCost),
    packagingCost: amountOrNull(form.packagingCost),
    logisticsCost: amountOrNull(form.logisticsCost),
    margin: amountOrNull(form.margin),
    otherCost1: amountOrNull(form.otherCost1),
    otherCost1Note: form.otherCost1Note || null,
    otherCost2: amountOrNull(form.otherCost2),
    otherCost2Note: form.otherCost2Note || null,
    otherCost3: amountOrNull(form.otherCost3),
    otherCost3Note: form.otherCost3Note || null,
    otherCost4: amountOrNull(form.otherCost4),
    otherCost4Note: form.otherCost4Note || null,
    currentPrice: amountOrNull(form.currentPrice),
    clientName: form.clientName || null,
  };
}

// 송연 updateComputedHints: 원재료비 → 고정마진 → 로스 순서로 누적
export function computedHints(materialCost: number | null, markupRate: string, lossRate: string) {
  const base = materialCost || 0;
  const markupAmount = (base * (parseFloat(markupRate) || 0)) / 100;
  const afterMarkup = base + markupAmount;
  const lossAmount = (afterMarkup * (parseFloat(lossRate) || 0)) / 100;
  return { markupAmount, afterMarkup, lossAmount, afterLoss: afterMarkup + lossAmount };
}

// 포장유형을 고르면 그 유형의 값으로 채운다(포장유형 비율은 이미 % — 소수 둘째 자리까지)
export const rateText = (percent: number | null) => (percent == null ? '' : String(Math.round(percent * 100) / 100));

// 원재료 구성에서 적용단가가 큰 5개(강조)
export function topAmountNames(bom: PricingBomLine[]): Set<string> {
  return new Set(
    [...bom]
      .filter((line) => line.amountPerKg != null)
      .sort((a, b) => (b.amountPerKg as number) - (a.amountPerKg as number))
      .slice(0, 5)
      .map((line) => line.materialName),
  );
}
