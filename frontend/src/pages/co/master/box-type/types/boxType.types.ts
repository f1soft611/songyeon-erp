// 공통관리 > 기초정보 > 포장유형(BoxTypeManagementPage) 화면이 주고받는 값 (tb_box_type)
// 비율(고정마진율 · 로스율)은 % 그대로(12.5 = 12.5%) 주고받는다.

// 포장유형 그리드 한 줄
export type BoxTypeRow = {
  id: string; // 저장된 줄은 box_type_id, 새 줄은 'new-packaging-…'
  boxTypeId: number | null;
  boxTypeCd: string; // 저장된 코드(PACK-…). 새 줄은 ''
  boxTypeNm: string;
  fixedMarginRate: number | null;
  lossRate: number | null;
  laborCost: number | null;
  packingCost: number | null;
  logisticsCost: number | null;
  marginAmt: number | null;
  // 읽기 전용(서버가 채운다). 등록자 · 수정자는 사번으로 저장하고, 화면에는 사원 이름을 보여준다
  regUserId: string;
  regUserNm: string;
  regDt: string;
  updUserId: string;
  updUserNm: string;
  updDt: string;
  useYn: string; // 'Y' 사용, 'N' 미사용(사용여부 칸에서 고른다)
};

// 조회 조건 사용여부: ALL 전체 · Y 사용중 · N 사용안함
export type BoxTypeUseFilter = 'ALL' | 'Y' | 'N';

// 서버 값(BoxTypeVO)
export interface BoxTypeVO {
  boxTypeId?: unknown;
  boxTypeCd?: unknown;
  boxTypeNm?: unknown;
  fixedMarginRate?: unknown;
  lossRate?: unknown;
  laborCost?: unknown;
  packingCost?: unknown;
  logisticsCost?: unknown;
  marginAmt?: unknown;
  totalCost?: unknown;
  sortSeq?: unknown;
  regUserId?: unknown;
  regUserNm?: unknown;
  regDt?: unknown;
  updUserId?: unknown;
  updUserNm?: unknown;
  updDt?: unknown;
  useYn?: unknown;
}

// 저장할 때 보내는 값. boxTypeId 가 없으면 새로 등록, 있으면 그 줄 수정
export type BoxTypeSavePayload = {
  boxTypeId: number | null;
  boxTypeCd: string;
  boxTypeNm: string;
  fixedMarginRate: number | null;
  lossRate: number | null;
  laborCost: number | null;
  packingCost: number | null;
  logisticsCost: number | null;
  marginAmt: number | null;
  useYn: 'Y' | 'N';
};
