import { apiGet } from './apiClient';
import type { SearchResponse, SearchType } from '../types/unifiedSearch.types';

export async function searchUnified(
  keyword: string,
  type: SearchType,
  offset: number,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    keyword,
    type,
    offset: String(offset),
    limit: type === 'ALL' ? '5' : '10',
  });
  const result = await apiGet<{ item: SearchResponse }>(`/api/v1/search?${params}`);
  return result.item;
}
