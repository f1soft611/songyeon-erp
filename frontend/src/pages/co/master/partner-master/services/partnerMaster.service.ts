import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { ClientMasterForm, ClientMasterRow, ClientTypeOption } from '../types/partnerMaster.types';

// 공통관리 > 기초정보 > 거래처마스터(BSPartnerMasterView, clients 표)
const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value: unknown) => (value == null ? '' : String(value));

const CLIENT_MASTER_PATH = '/api/v1/co/master/partner-master';

const toClientMasterRow = (item: Record<string, unknown>): ClientMasterRow => ({
  id: text(item.id),
  clientId: toNumberOrNull(item.id) ?? 0,
  clientCode: text(item.clientCode),
  name: text(item.name),
  clientType: text(item.clientType),
  clientTypeNm: text(item.clientTypeNm),
  businessNo: text(item.businessNo),
  ceoName: text(item.ceoName),
  businessType: text(item.businessType),
  businessItem: text(item.businessItem),
  phone: text(item.phone),
  fax: text(item.fax),
  mobile: text(item.mobile),
  email: text(item.email),
  zipcode: text(item.zipcode),
  address: text(item.address),
  addressDetail: text(item.addressDetail),
  memo: text(item.memo),
  useYn: item.useYn === 'N' ? 'N' : 'Y',
  regUserNm: text(item.regUserNm),
  regDt: text(item.regDt),
  updUserNm: text(item.updUserNm),
  updDt: text(item.updDt),
});

export async function fetchClientMasterRows(): Promise<ClientMasterRow[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(CLIENT_MASTER_PATH);
  return (result.resultList ?? []).map(toClientMasterRow);
}

export async function createClientMaster(form: ClientMasterForm): Promise<void> {
  await apiPost(CLIENT_MASTER_PATH, form);
}

export async function updateClientMaster(clientId: number, form: ClientMasterForm): Promise<void> {
  await apiPut(`${CLIENT_MASTER_PATH}/${clientId}`, form);
}

// 분류 고르기 항목: 공통코드 CUSTOMER_CATEGORY 의 사용 중 항목(2026-10-23)
export async function fetchClientTypes(): Promise<ClientTypeOption[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(`${CLIENT_MASTER_PATH}/client-types`);
  return (result.resultList ?? []).map((item) => ({ code: text(item.code), name: text(item.name) }));
}
