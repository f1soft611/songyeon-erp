import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { QuoteDetail, QuoteRow, toQuoteSaveBody } from '../utils/quote';

// 영업관리 > 견적 (송연 SA0003). 포장유형·거래처·원재료 목록은 기초정보 API 를 같이 쓴다.
const PATH = '/api/v1/sales/order/quote';
type QuoteSaveBody = ReturnType<typeof toQuoteSaveBody>;

export async function fetchQuotes(): Promise<QuoteRow[]> {
  const result = await apiGet<{ resultList: QuoteRow[] }>(PATH);
  return result.resultList ?? [];
}

// 상세(저장해 둔 배합비 포함, 배합비율은 퍼센트)
export async function fetchQuote(quoteId: number): Promise<QuoteDetail> {
  const result = await apiGet<{ item: QuoteDetail }>(`${PATH}/${quoteId}`);
  return result.item;
}

export async function createQuote(body: QuoteSaveBody): Promise<void> {
  await apiPost(PATH, body);
}

export async function updateQuote(quoteId: number, body: QuoteSaveBody): Promise<void> {
  await apiPut(`${PATH}/${quoteId}`, body);
}

export async function deleteQuote(quoteId: number): Promise<void> {
  await apiDelete(`${PATH}/${quoteId}`);
}
