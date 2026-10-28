// 공통관리 > 기초정보 > 제품마스터 · 제품등록 · 견적이 주고받는 값(2026-10-27 co/basic-info 에서 옮김)

// 제품 목록 한 줄(서버 ProductBomVO)
export type ProductBomRow = {
  id: string; // 제품코드
  code: string;
  name: string;
  spec: string;
  storage: string; // 보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)
  storageNm: string; // 보관방법 이름
  clientName: string; // 거래처마스터 이름(서버가 붙여 준다)
  clientCode: string; // 거래처코드(2026-10-23, 제품에는 이 코드를 저장한다)
  discontinued: boolean;
  discontinuedAt: string;
  discontinuedBy: string;
  // 등록자 · 등록일시 · 수정자 · 수정일시(2026-10-23, 제품 표 reg_user_id · reg_dt · upd_user_id · upd_dt. 이름은 사원 이름)
  regUserNm: string;
  regDt: string;
  updUserNm: string;
  updDt: string;
  materialCount: number;
  lastProducedDate: string;
};

// 배합비 한 줄(서버 BomLineVO). ratio 는 0~1
export type BomLine = {
  materialCode: string | null;
  materialName: string;
  ratio: number | null;
  unitPricePerKg: number | null;
  amountPerKg: number | null;
};

// 배합비 편집 그리드 한 줄. ratioPercent·unitPrice 는 화면 값(퍼센트, 원/kg)
export type BomEditRow = {
  id: string;
  materialName: string;
  ratioPercent: number | null;
  unitPrice: number | null;
  autoPrice: boolean; // 단가를 원재료 목록에서 자동으로 채웠는지(손으로 넣으면 false)
  materialCode: string | null;
};

export type BomLog = {
  logId: number;
  changedAt: string;
  oldBom: BomLine[];
  newBom: BomLine[];
};

export type SubMaterials = {
  pouchNetWeightKg: number | null;
  pouchLengthM: number | null;
  pouchPerUnit: number | null;
  filmMaterialName: string;
  pouchMaterialName: string;
  boxMaterialName: string;
};

// 거래처 고르기 목록 한 줄(2026-10-23): 이름을 보여 주고 거래처코드를 저장한다
export type ClientOption = { clientCode: string; name: string };

export type MaterialOption = {
  code: string;
  name: string;
  unitPrice: number | null;
  subCategory: string | null; // 부자재 분류 코드(공통코드 SUB_MATERIAL_CATEGORY, 2026-10-23)
  subCategoryNm: string; // 분류 이름(예: 필름), 원재료는 ''
};

export type MaterialCheck = {
  input: string;
  exact: boolean;
  suggestions: string[];
};
