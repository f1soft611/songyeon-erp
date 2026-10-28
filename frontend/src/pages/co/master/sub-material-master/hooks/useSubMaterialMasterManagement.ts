import {
  matchMaterialKeyword,
  matchSupplierKeyword,
  SUB_MATERIAL_INFO_FIELDS,
  useMaterialMasterManagement,
} from '../../material-master/hooks/useMaterialMasterManagement';
import type { MaterialMasterRow } from '../../material-master/types/materialMaster.types';
import { filterMaterialUse, type MaterialUseFilter } from '../../material-master/utils/materialMaster';
import { fetchSubMaterialRows } from '../services/subMaterialMaster.service';

// 표에 보일 줄: 사용여부 · 검색어(코드 · 이름) · 상세 조회 분류 · 납품업체(이름 · 거래처코드 일부, 비우면 전체)
export function filterSubMaterialMasterRows(
  rows: MaterialMasterRow[],
  keyword: string,
  useFilter: MaterialUseFilter,
  subCategory = '',
  supplierKeyword = '',
): MaterialMasterRow[] {
  return (filterMaterialUse(rows, useFilter) as MaterialMasterRow[]).filter(
    (row) =>
      matchMaterialKeyword(row, keyword) &&
      (!subCategory || row.subCategory === subCategory) &&
      matchSupplierKeyword(row, supplierKeyword),
  );
}

const fetchAllSubMaterials = () => fetchSubMaterialRows('');

// 부자재마스터 화면의 조회 · 저장 상태. 원재료와 같은 표(materials)라 원재료마스터의 저장 길을 그대로 쓰고, 분류 칸을 더 보낸다
export function useSubMaterialMasterManagement() {
  return useMaterialMasterManagement({
    fetchRows: fetchAllSubMaterials,
    infoFields: SUB_MATERIAL_INFO_FIELDS,
    what: '부자재',
  });
}
