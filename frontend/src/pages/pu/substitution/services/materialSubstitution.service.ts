import { apiDelete, apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { SubstitutionDetail, SubstitutionMaterial, SubstitutionSchedule } from '../utils/materialSubstitution';

// 구매관리 > 재료 치환등록 (송연 /api/material-substitution · /api/production-schedule/{id}/materials · substitute)
const PATH = '/api/v1/pu/material-substitution';

export async function fetchSchedules(date: string): Promise<SubstitutionSchedule[]> {
  const result = await apiGet<{ resultList: SubstitutionSchedule[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

export async function fetchDetail(scheduleId: number): Promise<SubstitutionDetail> {
  const result = await apiGet<{ item: SubstitutionDetail }>(`${PATH}/${scheduleId}`);
  return result.item;
}

// 대신 쓸 원재료 후보(코드 · 이름 · 재고)
export async function fetchMaterials(): Promise<SubstitutionMaterial[]> {
  const result = await apiGet<{ resultList: SubstitutionMaterial[] }>(`${PATH}/materials`);
  return result.resultList ?? [];
}

export async function substitute(scheduleId: number, fromMaterialCode: string, toMaterialCode: string, reason: string): Promise<SubstitutionDetail> {
  const result = await apiPost<{ item: SubstitutionDetail }>(`${PATH}/${scheduleId}`, { fromMaterialCode, toMaterialCode, reason: reason.trim() });
  return result.item;
}

export async function undoSubstitution(scheduleId: number, subId: number): Promise<SubstitutionDetail> {
  const result = await apiDelete<{ item: SubstitutionDetail }>(`${PATH}/${scheduleId}/${subId}`);
  return result.item;
}
