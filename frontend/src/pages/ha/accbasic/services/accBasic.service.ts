import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type { AccBank, AccCard, AccKind, AccSubject } from '../utils/accBasic';

// 인사·회계 > 기초회계정보 (송연 /api/accounting/subjects · bank-accounts · cards)
const PATH = '/api/v1/ha/acc-basic';
const SEGMENT: Record<AccKind, string> = { subject: 'subjects', bank: 'bank-accounts', card: 'cards' };

async function list<T>(kind: AccKind): Promise<T[]> {
  return (await apiGet<{ resultList: T[] }>(`${PATH}/${SEGMENT[kind]}`)).resultList ?? [];
}
export async function fetchAccBasic(): Promise<{ subjects: AccSubject[]; banks: AccBank[]; cards: AccCard[] }> {
  const [subjects, banks, cards] = await Promise.all([list<AccSubject>('subject'), list<AccBank>('bank'), list<AccCard>('card')]);
  return { subjects, banks, cards };
}
// id 가 없으면 새로 만들고, 있으면 고친다(사용 켜고 끄기도 고치기)
export const saveAcc = (kind: AccKind, id: number | null, body: Record<string, unknown>) =>
  (id == null ? apiPost(`${PATH}/${SEGMENT[kind]}`, body) : apiPut(`${PATH}/${SEGMENT[kind]}/${id}`, body));
export const deleteAcc = (kind: AccKind, id: number) => apiDelete(`${PATH}/${SEGMENT[kind]}/${id}`);
