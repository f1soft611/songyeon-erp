import { apiGet, apiGetPublic } from '../../../../shared/services/apiClient';
import type { TvRow } from '../../../../shared/components/TvScheduleBoard';
import type { LogisticsScheduleRow, ProductionScheduleRow } from '../types/schedule.types';

// 공통관리 > 생산스케줄·물류스케줄 (보기 전용)
const PATH = '/api/v1/co/schedules';

export async function fetchProductionSchedule(date: string): Promise<ProductionScheduleRow[]> {
  const result = await apiGet<{ resultList: ProductionScheduleRow[] }>(`${PATH}/production?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

export async function fetchLogisticsSchedule(date: string): Promise<LogisticsScheduleRow[]> {
  const result = await apiGet<{ resultList: LogisticsScheduleRow[] }>(`${PATH}/logistics?date=${encodeURIComponent(date)}`);
  return (result.resultList ?? []).map((row) => ({ ...row, key: `${row.source}-${row.id}` }));
}

// 현장 TV 화면(로그인 없이 열린다)이 쓰는 조회. TV 에 보이는 칸(거래처·품목명·수량·비고)만 온다.
export async function fetchTvProduction(date: string): Promise<TvRow[]> {
  const result = await apiGetPublic<{ resultList: TvRow[] }>(`/api/v1/tv/production?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}

export async function fetchTvLogistics(date: string): Promise<TvRow[]> {
  const result = await apiGetPublic<{ resultList: TvRow[] }>(`/api/v1/tv/logistics?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}
