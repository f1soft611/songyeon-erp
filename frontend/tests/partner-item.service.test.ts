import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

import { fetchPartnerItemRows } from '../src/pages/co/master/partner-item/services/partnerItem.service';
import { filterClientProducts } from '../src/pages/co/master/partner-item/hooks/usePartnerItemManagement';
import type { PartnerItemRow } from '../src/pages/co/master/partner-item/types/partnerItem.types';

describe('거래처별 제품조회(BSPartnerItemView) 화면 규칙', () => {
  it('거래처코드 · 거래처명을 적어야 그 거래처의 제품만 보여준다(부분 일치)', () => {
    const rows = [
      { code: '1', clientCode: '000012', clientName: '(주) 예시식품' },
      { code: '2', clientCode: '000034', clientName: '가나상회' },
    ] as PartnerItemRow[];
    expect(filterClientProducts(rows, ' ')).toEqual([]);
    expect(filterClientProducts(rows, '예시').map((row) => row.code)).toEqual(['1']);
    expect(filterClientProducts(rows, '000034').map((row) => row.code)).toEqual(['2']);
    expect(filterClientProducts(rows, '0000').map((row) => row.code)).toEqual(['1', '2']);
  });
});

describe('거래처별 제품조회(BSPartnerItemView) 서비스', () => {
  beforeEach(() => apiGet.mockReset());

  it('이 화면 API 에서 사용 중인 제품을 받아 제품 줄 모양으로 바꾼다', async () => {
    apiGet.mockResolvedValue({ resultList: [{ code: '000001', name: '국물두루치기분말', clientName: '(주) 디에이치식품', discontinued: 0, materialCount: '3' }] });
    const rows = await fetchPartnerItemRows();
    expect(apiGet).toHaveBeenCalledWith('/api/v1/co/master/partner-item');
    expect(rows[0]).toMatchObject({ id: '000001', code: '000001', clientName: '(주) 디에이치식품', discontinued: false, materialCount: 3 });
  });
});
