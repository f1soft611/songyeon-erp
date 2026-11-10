// 품질관리 > 품질검사 > 제품검사(송연 qdoc-spec.html · 41-qdoc-spec.js · 42-qdoc-pspec.js)
// 2026-11-06 화면을 옮기고, 제품별 기준 탭 · 검사 탭은 조회까지 붙였다. 염도·BRIX 현황은 줄 모양(타입)만 원본 응답 이름에 맞춰 둔다.

export type InspectionTab = 'check' | 'spec' | 'trend';

export const INSPECTION_TABS: { value: InspectionTab; label: string }[] = [
  { value: 'check', label: '검사' },
  { value: 'spec', label: '제품별 기준' },
  // 원본의 '식품유형' 탭은 뺐다. 식품유형은 공통코드 FOOD_TYPE 에서 관리한다(2026-11-05)
  { value: 'trend', label: '염도·BRIX 현황' },
];

// 성적서 상태(원본 record_status). 빈 값 = 아직 안 함
export type RecordStatus = '' | '작성중' | '검토대기' | '반려' | '승인';

export const DATE_BY_OPTIONS = [
  { value: 'made', label: '제조일' },
  { value: 'ship', label: '출고일' },
];

export const RECORD_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: '아직', label: '아직 안 쓴 것' },
  { value: '검토대기', label: '검토 기다리는 것' },
  { value: '반려', label: '반려된 것' },
  { value: '승인', label: '승인된 것' },
];

export const SPEC_ONLY_OPTIONS = [
  { value: '유형있음', label: '식품유형 있는 것' },
  { value: '유형없음', label: '식품유형 없는 것' },
  { value: '규격있음', label: '기준 넣은 것' },
  { value: '규격없음', label: '기준 안 넣은 것' },
];

// 검사 탭 한 줄(원본 /api/qdoc/lots)
export type InspectionLotRow = {
  lotId: number;
  lotNo: string;
  madeOn: string;
  productName: string;
  foodTypeName: string;
  qty: string;
  qtyIsActual: boolean;
  shippedOn: string;
  shipState: string;
  recordId: number | null;
  recordStatus: RecordStatus;
  netWeight?: string;
  shelfLife?: string;
};

// 제품별 기준 탭 한 줄(원본 /api/qdoc/pspec/products)
export type ProductSpecRow = {
  code: string;
  name: string;
  spec: string;
  foodTypeName: string;
  specs: { label: string; text: string }[];
};

// 제품별 기준 요약(검색과 관계없이 사용 중인 제품 전체)
export type ProductSpecStats = { total: number; typed: number; withSpec: number };

// 원본 요약 문구(42-qdoc-pspec.js)
export const specSummaryText = (stats: ProductSpecStats) =>
  `제품 ${stats.total}개 · 식품유형 정한 것 ${stats.typed}개 · 규격 넣은 것 ${stats.withSpec}개`;

// 검사 탭 상태 고르기(원본 loadQdocSpec): 받아온 줄을 화면에서 거른다
export const filterLots = (lots: InspectionLotRow[], want: string) =>
  lots.filter((lot) => (!want ? true : want === '아직' ? !lot.recordStatus : lot.recordStatus === want));

// 원본 qs-summary(거르기 전 전체)
export const lotSummaryText = (lots: InspectionLotRow[]) =>
  `로트 ${lots.length}건 · 아직 검사 안 한 것 ${lots.filter((lot) => !lot.recordStatus).length}건 · 검토 기다리는 것 ${lots.filter((lot) => lot.recordStatus === '검토대기').length}건`;

// 거른 줄이 없을 때, 생산이 끝난 것만 보고 있다는 사실을 밝힌다(원본: 그냥 '없습니다' 면 오늘 만든 물건이 왜 안 보이는지 모른다)
export const LOT_PLANNED_HINT = "생산이 끝난 것(실생산량이 들어온 줄)만 보고 있습니다 — '생산예정도 보기'를 켜보세요.";

// 염도·BRIX 현황 한 줄
export type InspectionTrendRow = {
  recordId: number;
  measuredOn: string;
  madeOn: string;
  lotNo: string;
  productName: string;
  saltSpec: string;
  saltResult: string;
  brixSpec: string;
  brixResult: string;
};

export const RECORD_STATUS_TEXT: Record<RecordStatus, string> = {
  '': '아직 안 함',
  작성중: '작성중',
  검토대기: '검토 대기',
  반려: '반려',
  승인: '승인',
};

// 출고일이 '예정' 인지 '확정' 인지 밝힌다(원본: 확정이면 날짜만)
export const shipText = (shippedOn?: string, shipState?: string) =>
  !shippedOn ? '' : !shipState || shipState === '확정' ? shippedOn : `${shippedOn} (${shipState})`;
