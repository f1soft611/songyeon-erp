import { apiGet } from '../../../../../shared/services/apiClient';
import type { InspectionLotRow, ProductSpecRow, ProductSpecStats, RecordStatus } from '../utils/productInspection';

// 품질관리 > 품질검사 > 제품검사 (송연 qdocs.py). 2026-11-06 제품별 기준 탭 · 검사 탭 조회만
const PATH = '/api/v1/qm/inspection/product-inspection';

type ProductSpecApiRow = { code: string; name: string | null; spec: string | null; foodType: string | null; foodTypeNm: string | null };

// 제품별 기준 표(송연 qdoc_product_spec)가 아직 없어 넣은 기준은 늘 빈 목록
const toProductSpecRow = (row: ProductSpecApiRow): ProductSpecRow => ({
  code: row.code,
  name: row.name ?? '',
  spec: row.spec ?? '',
  foodTypeName: row.foodTypeNm ?? row.foodType ?? '',
  specs: [],
});

export async function fetchProductSpecs(q: string, only: string): Promise<{ rows: ProductSpecRow[]; stats: ProductSpecStats }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (only) params.set('only', only);
  const query = params.toString();
  const body = await apiGet<{ resultList?: ProductSpecApiRow[]; stats?: ProductSpecStats }>(`${PATH}/product-specs${query ? `?${query}` : ''}`);
  return {
    rows: (body.resultList ?? []).map(toProductSpecRow),
    stats: body.stats ?? { total: 0, typed: 0, withSpec: 0 },
  };
}

type InspectionLotApiRow = {
  lotId: number;
  lotNo: string | null;
  madeOn: string | null;
  productName: string | null;
  foodType: string | null;
  foodTypeNm: string | null;
  netWeight: string | null;
  shelfLife: string | null;
  qty: string | null;
  qtyIsActual: boolean | null;
  shippedOn: string | null;
  shipState: string | null;
  recordId: number | null;
  recordStatus: string | null;
};

const toInspectionLotRow = (row: InspectionLotApiRow): InspectionLotRow => ({
  lotId: row.lotId,
  lotNo: row.lotNo ?? '',
  madeOn: row.madeOn ?? '',
  productName: row.productName ?? '',
  foodTypeName: row.foodTypeNm ?? row.foodType ?? '',
  qty: row.qty ?? '',
  qtyIsActual: Boolean(row.qtyIsActual),
  shippedOn: row.shippedOn ?? '',
  shipState: row.shipState ?? '',
  recordId: row.recordId ?? null,
  // 성적서 표(송연 qdoc_record)가 아직 없어 지금은 늘 빈 값 = 아직 안 함
  recordStatus: (row.recordStatus ?? '') as RecordStatus,
  netWeight: row.netWeight ?? '',
  shelfLife: row.shelfLife ?? '',
});

export type InspectionLotQuery = { start: string; end: string; dateBy: string; planned: boolean };

// 원본처럼 기간은 시작일 · 종료일이 둘 다 있을 때만 붙인다(날짜 기준도 그때만)
export async function fetchInspectionLots({ start, end, dateBy, planned }: InspectionLotQuery): Promise<InspectionLotRow[]> {
  const params = new URLSearchParams();
  if (start && end) {
    params.set('start', start);
    params.set('end', end);
    params.set('dateBy', dateBy || 'made');
  }
  if (planned) params.set('planned', 'true');
  const query = params.toString();
  const body = await apiGet<{ resultList?: InspectionLotApiRow[] }>(`${PATH}/lots${query ? `?${query}` : ''}`);
  return (body.resultList ?? []).map(toInspectionLotRow);
}
