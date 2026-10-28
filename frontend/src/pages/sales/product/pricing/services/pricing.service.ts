import { apiGet, apiPut } from '../../../../shared/services/apiClient';

// 영업관리 > 단가관리 값(서버 PricingVO)
export type PricingRow = {
  id: string; // 제품코드
  productCode: string;
  productName: string;
  spec: string;
  materialCost: number | null;
  laborCost: number | null;
  packagingCost: number | null;
  logisticsCost: number | null;
  margin: number | null;
  totalPrice: number | null; // 제품단가(최종계산단가)
  currentPrice: number | null; // 현재 판매단가
  clientName: string;
  diff: number | null; // 차액금 = 현재단가 − 제품단가(둘 중 하나라도 없으면 null)
  detailAction?: never; // 표의 [상세] 단추 칸 자리(값 없음, 2026-10-27)
};

export type PricingDetail = PricingRow & {
  productType: string;
  markupRate: number | null; // %(입력한 값 그대로)
  lossRate: number | null; // %
  otherCost1: number | null;
  otherCost1Note: string;
  otherCost2: number | null;
  otherCost2Note: string;
  otherCost3: number | null;
  otherCost3Note: string;
  otherCost4: number | null;
  otherCost4Note: string;
};

export type PricingBomLine = {
  id: string;
  materialName: string;
  ratio: number | null; // 0~1
  amountPerKg: number | null;
};

type ApiRow = Record<string, unknown>;
const PATH = '/api/v1/sa/pricing';
const text = (value: unknown) => (value == null ? '' : String(value));
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRow = (item: ApiRow): PricingRow => ({
  id: text(item.productCode),
  productCode: text(item.productCode),
  productName: text(item.productName),
  spec: text(item.spec),
  materialCost: num(item.materialCost),
  laborCost: num(item.laborCost),
  packagingCost: num(item.packagingCost),
  logisticsCost: num(item.logisticsCost),
  margin: num(item.margin),
  totalPrice: num(item.totalPrice),
  currentPrice: num(item.currentPrice),
  clientName: text(item.clientName),
  diff: num(item.currentPrice) != null && num(item.totalPrice) != null
    ? (num(item.currentPrice) as number) - (num(item.totalPrice) as number)
    : null,
});

// 송연 loadTable: 제품명·제품코드·거래처 부분 일치(서버 검색)
export async function fetchPricingRows(q: string): Promise<PricingRow[]> {
  const query = q.trim();
  const result = await apiGet<{ resultList: ApiRow[] }>(`${PATH}${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  return (result.resultList ?? []).map(toRow);
}

// 송연 selectProduct: 단가상세 창(단가표 + 원재료 구성)
export async function fetchPricingDetail(code: string): Promise<{ detail: PricingDetail; bom: PricingBomLine[] }> {
  const result = await apiGet<{ item?: ApiRow; bomList?: ApiRow[] }>(`${PATH}/${encodeURIComponent(code)}`);
  const item = result.item ?? {};
  return {
    detail: {
      ...toRow(item),
      productType: text(item.productType),
      markupRate: num(item.markupRate),
      lossRate: num(item.lossRate),
      otherCost1: num(item.otherCost1),
      otherCost1Note: text(item.otherCost1Note),
      otherCost2: num(item.otherCost2),
      otherCost2Note: text(item.otherCost2Note),
      otherCost3: num(item.otherCost3),
      otherCost3Note: text(item.otherCost3Note),
      otherCost4: num(item.otherCost4),
      otherCost4Note: text(item.otherCost4Note),
    },
    bom: (result.bomList ?? []).map((line, index) => ({
      id: String(index),
      materialName: text(line.materialName),
      ratio: num(line.ratioPercent),
      amountPerKg: num(line.amountPerKg),
    })),
  };
}

// 송연 reg-save: 보낸 항목만 고치고 제품단가를 다시 계산한다
export async function savePricing(code: string, body: Record<string, unknown>): Promise<void> {
  await apiPut(`${PATH}/${encodeURIComponent(code)}`, body);
}
