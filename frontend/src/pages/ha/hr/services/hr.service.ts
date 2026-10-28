import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { HrEmployee, HrForm, LeaveDetail, LeaveSummary } from '../utils/hr';

// 인사·회계 > 인사관리 (송연 /api/employees · /api/hr/leave)
const PATH = '/api/v1/ha/hr';

export async function fetchEmployees(): Promise<HrEmployee[]> {
  return (await apiGet<{ resultList: HrEmployee[] }>(`${PATH}/employees`)).resultList ?? [];
}
export async function fetchResidentNo(id: string): Promise<string> {
  return (await apiGet<{ residentNo: string }>(`${PATH}/employees/${id}/resident-no`)).residentNo;
}
export async function createEmployee(body: Partial<HrForm> & { name: string }): Promise<string> {
  return String((await apiPost<{ id: string }>(`${PATH}/employees`, body)).id);
}
export const updateEmployee = (id: string, body: HrForm) => apiPut(`${PATH}/employees/${id}`, body);
export const saveAccount = (id: string, username: string, password: string) => apiPut(`${PATH}/employees/${id}/account`, { username, password });
export const revokeAccount = (id: string) => apiDelete(`${PATH}/employees/${id}/account`);

export async function fetchLeave(date: string): Promise<{ date: string; rows: LeaveSummary[] }> {
  return (await apiGet<{ item: { date: string; rows: LeaveSummary[] } }>(`${PATH}/leave?date=${encodeURIComponent(date)}`)).item;
}
export async function fetchLeaveDetail(employeeId: string, date: string): Promise<LeaveDetail> {
  return (await apiGet<{ item: LeaveDetail }>(`${PATH}/leave/${employeeId}?date=${encodeURIComponent(date)}`)).item;
}
export const createLeave = (body: { employeeId: string; leaveDate: string; days: number; note: string }) => apiPost(`${PATH}/leave`, body);
export const deleteLeave = (id: number) => apiDelete(`${PATH}/leave/records/${id}`);
