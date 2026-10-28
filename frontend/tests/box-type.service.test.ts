import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}));

import {
  deleteBoxType,
  fetchBoxTypeRows,
  saveBoxType,
  toBoxTypePayload,
} from '../src/pages/co/master/box-type/services/boxType.service';
import { filterBoxTypeRows } from '../src/pages/co/master/box-type/utils/boxType';

const blank = {
  fixedMarginRate: null, lossRate: null, laborCost: null, packingCost: null, logisticsCost: null, marginAmt: null,
  regUserId: '', regUserNm: '', regDt: '', updUserId: '', updUserNm: '', updDt: '', useYn: 'Y',
};

describe('기준정보 > 포장유형(BoxTypeManagementPage, tb_box_type) 서비스', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
  });

  it('목록: box_type_id 를 줄 키로 쓰고, 비율은 % 그대로, 빈 값은 null, 등록자 · 일시는 글자 그대로(없으면 빈칸)', async () => {
    apiGet.mockResolvedValue({
      resultList: [
        { boxTypeId: 7, boxTypeCd: 'BOX005KG', boxTypeNm: '소포장 5kg', fixedMarginRate: 15, lossRate: '3.000', laborCost: 1200, packingCost: null, logisticsCost: '500', marginAmt: undefined, totalCost: 2550, regUserId: '0000', regUserNm: '관리자', regDt: '2026-10-19 09:10:11', updUserId: null, updUserNm: null, updDt: null, useYn: 'N' },
      ],
    });

    const rows = await fetchBoxTypeRows();

    expect(apiGet).toHaveBeenCalledWith('/api/v1/co/master/box-type');
    // 포장유형 화면은 사용안함 줄도 받는다
    await fetchBoxTypeRows(true);
    expect(apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/box-type?includeUnused=true');
    expect(rows).toEqual([
      {
        id: '7', boxTypeId: 7, boxTypeCd: 'BOX005KG', boxTypeNm: '소포장 5kg',
        fixedMarginRate: 15, lossRate: 3, laborCost: 1200, packingCost: null, logisticsCost: 500, marginAmt: null,
        regUserId: '0000', regUserNm: '관리자', regDt: '2026-10-19 09:10:11', updUserId: '', updUserNm: '', updDt: '', useYn: 'N',
      },
    ]);
  });

  it('저장 값: 새 줄 코드는 비워 보낸다(서버가 6자리로 매김), 이름 앞뒤 공백을 지우고, 비율은 바꾸지 않는다(%), 새 줄은 boxTypeId 없음', () => {
    expect(
      toBoxTypePayload({ ...blank, id: 'new-packaging-1', boxTypeId: null, boxTypeCd: '', boxTypeNm: '  대포장(1kg) ', fixedMarginRate: 12.5, marginAmt: 0 }),
    ).toEqual({
      boxTypeId: null, boxTypeCd: '', boxTypeNm: '대포장(1kg)',
      fixedMarginRate: 12.5, lossRate: null, laborCost: null, packingCost: null, logisticsCost: null, marginAmt: 0, useYn: 'Y',
    });
    // 사용여부 체크박스(2026-10-22): 끈 줄은 'N' 으로 보낸다
    expect(toBoxTypePayload({ ...blank, id: '7', boxTypeId: 7, boxTypeCd: 'PACK-001', boxTypeNm: 'A', useYn: 'N' }).useYn).toBe('N');
  });

  it('저장 · 삭제 주소: 저장은 POST 하나(id 로 등록/수정), 삭제는 box_type_id', async () => {
    await saveBoxType({ ...blank, boxTypeId: 7, boxTypeCd: 'A', boxTypeNm: 'A' });
    await deleteBoxType(7);

    expect(apiPost).toHaveBeenCalledWith('/api/v1/co/master/box-type', expect.objectContaining({ boxTypeId: 7, boxTypeCd: 'A' }));
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/co/master/box-type/7');
  });

  it('새 줄은 늘 빈 코드(서버가 000001 … 로 매김), 저장된 줄 코드는 그대로', () => {
    expect(toBoxTypePayload({ ...blank, id: 'new-packaging-1', boxTypeId: null, boxTypeCd: '', boxTypeNm: '소포장' }).boxTypeCd).toBe('');
    expect(toBoxTypePayload({ ...blank, id: '7', boxTypeId: 7, boxTypeCd: 'BT001', boxTypeNm: '소포장' }).boxTypeCd).toBe('BT001');
  });

  it('조회 조건: 포장유형명 포함 + 사용여부(전체 · 사용중 · 사용안함). 코드로는 찾지 않는다', () => {
    const rows = [
      { ...blank, id: '1', boxTypeId: 1, boxTypeCd: 'PACK-POUCH', boxTypeNm: '파우치 포장', useYn: 'Y' },
      { ...blank, id: '2', boxTypeId: 2, boxTypeCd: 'PACK-BULK', boxTypeNm: '벌크 포장', useYn: 'N' },
    ];
    expect(filterBoxTypeRows(rows, '', 'ALL').map((r) => r.id)).toEqual(['1', '2']);
    expect(filterBoxTypeRows(rows, '', 'Y').map((r) => r.id)).toEqual(['1']);
    expect(filterBoxTypeRows(rows, '', 'N').map((r) => r.id)).toEqual(['2']);
    expect(filterBoxTypeRows(rows, '벌크', 'ALL').map((r) => r.id)).toEqual(['2']);
    expect(filterBoxTypeRows(rows, 'bulk', 'ALL').length).toBe(0);
    expect(filterBoxTypeRows(rows, '파우치', 'N').length).toBe(0);
  });
});
