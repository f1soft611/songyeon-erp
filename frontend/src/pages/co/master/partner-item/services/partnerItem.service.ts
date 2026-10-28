import { apiGet } from '../../../../../shared/services/apiClient';
import { toProductBomRow } from '../../item-master/services/itemMaster.service';
import type { ProductBomRow } from '../../item-master/types/itemMaster.types';

// 공통관리 > 기초정보 > 거래처별 제품조회(BSPartnerItemView). 사용 중인 제품 목록(거래처명 포함). 거래처명으로 거르는 것은 화면이 한다
const PARTNER_ITEM_PATH = '/api/v1/co/master/partner-item';

export async function fetchPartnerItemRows(): Promise<ProductBomRow[]> {
  const result = await apiGet<{ resultList: Record<string, unknown>[] }>(PARTNER_ITEM_PATH);
  return (result.resultList ?? []).map(toProductBomRow);
}
