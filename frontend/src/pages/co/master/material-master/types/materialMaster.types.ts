// 공통관리 > 기초정보 > 원재료마스터 · 부자재마스터가 주고받는 값(2026-10-27 co/basic-info 에서 옮김)

// 납품업체 한 곳: 업체코드(거래처 clients.id)와 업체명. 송연 원본이 넣은 옛 줄은 업체코드가 없을 수 있다.
// 납품업체(2026-10-23): code = 거래처코드(6자리, 예전 거래처 id). 거래처BOM 에 없는 옛 업체는 null
export type VendorOption = { code: string | null; name: string };

// 원재료 한 줄(서버 MaterialMasterVO). 부자재도 같은 표에 있어 subCategory 로 갈라 본다.
export type MaterialRow = {
  id: string; // 원재료코드
  code: string;
  name: string;
  spec: string;
  unitPrice: number | null;
  stockQty: number | null;
  supplier: string; // 예전 한 칸짜리 구매업체
  suppliers: VendorOption[]; // 납품업체(여러 곳)
  safetyStock: number | null;
  baseOrderQty: number | null;
  allergens: string;
  subCategory: string; // 부자재 분류 코드(공통코드 SUB_MATERIAL_CATEGORY, 2026-10-23. 예: 001), 원재료는 ''
  subCategoryNm: string; // 분류 이름(예: 필름), 원재료는 ''
  unit: string; // 입고단위 코드(공통코드 UNIT, 2026-10-23. 예: 001)
  unitNm: string; // 입고단위 이름(예: KG)
  // 등록자 · 등록일시 · 수정자 · 수정일시(2026-10-23, 보기만. 서버가 로그인 사원으로 채운다)
  regUserNm: string;
  regDt: string;
  updUserNm: string;
  updDt: string;
  useYn: 'Y' | 'N'; // 사용여부(2026-10-23). 원재료마스터 · 부자재마스터 체크박스 + [저장]으로 바꾼다
  unitWeight: number | null; // 한 봉 몇 kg
  boxQty: number | null; // 한 박스 몇 봉
  lastUsedDate: string;
  usedByCount: number | null; // 이 부자재를 걸어둔 제품 수(부자재BOM)
};

// 원재료마스터 그리드 줄(2026-10-27, 내장 상세 창으로 등록 · 수정).
// supplierCodes: 납품업체 거래처코드(창에서 여러 곳 고르기), priceDate: 단가 적용일자(비우면 바로),
// workAction · historyAction: 표의 [역전개 · 일괄적용] · [이력] 단추 칸 자리(값 없음)
export type MaterialMasterRow = MaterialRow & {
  supplierCodes: string[];
  priceDate: string;
  workAction?: never;
  historyAction?: never;
};

// 배합비 역전개 한 줄
export type MaterialUsageRow = {
  id: string; // 제품코드
  productCode: string;
  productName: string;
  productSpec: string;
  ratio: number | null; // 0~1
};

export type PriceLogRow = { changedAt: string; oldPrice: number | null; newPrice: number | null };
export type PriceScheduleRow = { id: number; newPrice: number | null; effectiveDate: string; applied: boolean };

// 기본정보 저장 결과: 이름을 바꿨으면 어디까지 따라 바뀌었는지
export type MaterialInfoSaved = {
  renamedFrom: string;
  cascadedBom: number;
  cascadedRecipeVersion: number;
  cascadedRecipeSkipped: number;
};
export type MaterialPriceSaved = { scheduled: boolean; effectiveDate: string; affectedProducts: number };

// 원재료 창 기본정보 칸(서버로 보내는 이름 그대로)
export type MaterialInfoPayload = {
  name: string;
  spec: string;
  supplierCodes: string[]; // 납품업체는 거래처코드로 보낸다(2026-10-23, 서버가 업체명을 찾아 같이 적는다)
  allowDuplicate?: boolean; // 이름·규격이 같은 원재료가 있어도 저장(확인 창에서 '그래도 저장')
  subCategory?: string; // 부자재 창에서만 보낸다(원재료 창은 안 보내서 서버가 그 칸을 건드리지 않음)
  unit: string;
  safetyStock: string;
  baseOrderQty: string;
  allergens: string;
  unitWeight: string;
  boxQty: string;
};
