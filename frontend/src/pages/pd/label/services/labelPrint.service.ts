import { apiGet } from '../../../../shared/services/apiClient';
import type { LabelPrintRecord } from '../utils/labelPrint';

// 생산관리 > 라벨출력 (송연 PD0004). 라벨 한 장을 그리는 데 드는 버전·양식·회사정보는 공용 라벨 창(LabelPrintDialog)이 부른다.
const PATH = '/api/v1/pd/label-print';

export async function fetchLabelPrintRows(date: string): Promise<LabelPrintRecord[]> {
  const result = await apiGet<{ resultList: LabelPrintRecord[] }>(`${PATH}?date=${encodeURIComponent(date)}`);
  return result.resultList ?? [];
}
