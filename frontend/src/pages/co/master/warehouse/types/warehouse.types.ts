// 공통관리 > 기초정보 > 창고등록(BSWarehouseView) 화면이 주고받는 값 (tb_warehouse)

// 창고유형: 표 CHECK(ck_wh_type) 와 같은 값
export const WAREHOUSE_TYPES = ['원자재', '부자재', '재공', '완제품', '반품', '보류', '폐기', '외부'] as const;
export const NEW_WAREHOUSE_TYPE = '원자재'; // 새 줄의 처음 유형

// 창고코드(2026-10-22): 화면에서 받지 않는다. 새로 등록하면 서버가 6자리 숫자(000001 …)로 매긴다

// 창고등록 그리드 한 줄
export type WarehouseRow = {
  id: string; // 저장된 줄은 DB id 문자열, 새 줄은 'new-warehouse-…'
  warehouseId: number | null;
  warehouseCd: string; // 저장된 코드. 새 줄은 ''
  name: string;
  warehouseType: string;
  isDefault: boolean; // 기본창고(전체에서 한 곳 = 입고창고)
  remark: string; // 화면 칸은 없앴다(2026-10-20). 저장된 값은 그대로 다시 보낸다
  materialCount: number; // 두고 있는 원재료 수(칸은 없앴지만 있으면 지울 수 없음)
  regUserNm: string;
  regDt: string;
  updUserNm: string;
  updDt: string;
  useYn: string; // 사용여부: 'Y' 사용, 'N' 미사용(사용여부 칸에서 고른다)
};

// 조회 조건 상태: ALL 전체 · Y 사용중 · N 사용안함
export type WarehouseUseFilter = 'ALL' | 'Y' | 'N';

// 서버 값(WarehouseVO)
export interface WarehouseVO {
  warehouseId?: unknown;
  warehouseCd?: unknown;
  warehouseNm?: unknown;
  warehouseType?: unknown;
  defaultYn?: unknown;
  remark?: unknown;
  sortSeq?: unknown;
  materialCount?: unknown;
  regUserNm?: unknown;
  regDt?: unknown;
  updUserNm?: unknown;
  updDt?: unknown;
  useYn?: unknown;
}

export type WarehouseSavePayload = {
  name: string;
  warehouseType: string;
  remark: string;
  isDefault?: boolean; // 수정할 때는 바뀐 경우에만 보낸다
  useYn: 'Y' | 'N'; // 상태 체크박스(2026-10-22)
};
