import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { TempChannel, TempGroup, TempReading, TempSensor, TempSettings } from '../utils/temperature';

// 품질관리 > 실시간 온도 (송연 /api/temp/*). 그룹 이름은 본문·쿼리로 보낸다
const PATH = '/api/v1/qm/temperature';

export async function fetchTempSettings(): Promise<TempSettings> {
  return (await apiGet<{ item: TempSettings }>(`${PATH}/settings`)).item;
}

export async function fetchSensors(): Promise<TempSensor[]> {
  return (await apiGet<{ resultList: TempSensor[] }>(`${PATH}/sensors`)).resultList ?? [];
}

export async function createSensors(items: { name: string; sensorId: string }[]): Promise<number> {
  return (await apiPost<{ created: number }>(`${PATH}/sensors/bulk`, { items })).created ?? 0;
}

export const updateSensor = (id: number, body: { name: string; sensorId: string; minTemp: number | null; maxTemp: number | null; groupName: string | null }) =>
  apiPut(`${PATH}/sensors/${id}`, body);
export const moveSensor = (id: number, groupName: string) => apiPut(`${PATH}/sensors/${id}/group`, { groupName });
export const deleteSensor = (id: number) => apiDelete(`${PATH}/sensors/${id}`);

export async function fetchGroups(): Promise<TempGroup[]> {
  return (await apiGet<{ resultList: TempGroup[] }>(`${PATH}/groups`)).resultList ?? [];
}

export const createGroup = (name: string) => apiPost(`${PATH}/groups`, { name });
export const setRefreshInterval = (name: string, seconds: number) => apiPut(`${PATH}/groups/refresh-interval`, { name, seconds });
export const renameGroup = (name: string, newName: string) => apiPut(`${PATH}/groups/rename`, { name, newName });
export const deleteGroup = (name: string) => apiDelete(`${PATH}/groups?name=${encodeURIComponent(name)}`);

export async function fetchChannels(): Promise<TempChannel[]> {
  return (await apiGet<{ resultList: TempChannel[] }>(`${PATH}/channels`)).resultList ?? [];
}

export async function fetchReadings(force: boolean): Promise<TempReading[]> {
  return (await apiGet<{ resultList: TempReading[] }>(`${PATH}/readings${force ? '?force=1' : ''}`)).resultList ?? [];
}
