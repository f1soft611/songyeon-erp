import { apiGet } from '../../../../../shared/services/apiClient';
import type { MaterialRow } from '../../material-master/types/materialMaster.types';
import { toMaterialRow } from '../../material-master/services/materialMaster.service';

// 공통관리 > 기초정보 > 부자재마스터 주소(/api/v1/co/master/sub-material-master). 2026-10-27 co/basic-info 에서 옮김
const SUB_MATERIAL_MASTER_PATH = '/api/v1/co/master/sub-material-master';
type ApiRow = Record<string, unknown>;

export async function fetchSubMaterialRows(category: string): Promise<MaterialRow[]> {
  const result = await apiGet<{ resultList: ApiRow[] }>(
    `${SUB_MATERIAL_MASTER_PATH}${category ? `?category=${encodeURIComponent(category)}` : ''}`,
  );
  return (result.resultList ?? []).map(toMaterialRow);
}
