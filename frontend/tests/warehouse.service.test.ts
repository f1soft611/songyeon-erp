import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
}));

import {
  createWarehouse,
  fetchWarehouseRows,
  updateWarehouse,
} from '../src/pages/co/master/warehouse/services/warehouse.service';
import {
  defaultRowsToClear,
  filterWarehouseRows,
  validateWarehouseChanges,
  WAREHOUSE_EXCEL_COLUMNS,
} from '../src/pages/co/master/warehouse/utils/warehouse';
import type { WarehouseRow } from '../src/pages/co/master/warehouse/types/warehouse.types';

const LAST_RECEIVING = '입고가 들어오는 창고는 한 곳은 있어야 해요. 다른 창고를 먼저 지정해주세요';

const wh = (overrides: Partial<WarehouseRow>): WarehouseRow => ({
  id: '1',
  warehouseId: 1,
  warehouseCd: 'WH001',
  name: '계량창고',
  warehouseType: '원자재',
  isDefault: false,
  remark: '',
  materialCount: 0,
  regUserNm: '',
  regDt: '',
  updUserNm: '',
  updDt: '',
  useYn: 'Y',
  ...overrides,
});
const noChanges = { insertedRows: [], updatedRows: [], deletedRows: [] };

describe('기초정보 > 창고등록(BSWarehouseView, tb_warehouse)', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPut.mockReset();
  });

  it('서버 값을 그리드 줄로 바꾼다(기본창고 Y → 체크, 빈 값 → 빈 문자열)', async () => {
    apiGet.mockResolvedValue({
      resultList: [
        {
          warehouseId: 2, warehouseCd: 'WH-RM-CL', warehouseNm: '자재창고', warehouseType: '원자재', defaultYn: 'Y',
          remark: null, sortSeq: 10, materialCount: 12, regUserNm: '관리자', regDt: '2026-10-19 09:00:00', updUserNm: null, updDt: null,
        },
        {
          warehouseId: 3, warehouseCd: 'WH002', warehouseNm: '냉장창고', warehouseType: '완제품', defaultYn: 'N',
          remark: '냉장품', sortSeq: 20, materialCount: 0,
        },
      ],
    });

    expect(await fetchWarehouseRows()).toEqual([
      wh({
        id: '2', warehouseId: 2, warehouseCd: 'WH-RM-CL', name: '자재창고', isDefault: true, materialCount: 12,
        regUserNm: '관리자', regDt: '2026-10-19 09:00:00',
      }),
      wh({ id: '3', warehouseId: 3, warehouseCd: 'WH002', name: '냉장창고', warehouseType: '완제품', remark: '냉장품' }),
    ]);
  });

  it('등록은 기본창고 표시를 보내고, 수정은 기본창고가 바뀐 경우에만 보낸다', async () => {
    apiPut.mockResolvedValue({ moved: 4 });

    await createWarehouse({ name: ' 냉동창고 ', warehouseType: '원자재', remark: ' ', isDefault: false, useYn: 'Y' });
    const moved = await updateWarehouse(1, { name: '계량실', warehouseType: '원자재', remark: '', useYn: 'Y' });
    await updateWarehouse(3, { name: '냉장창고', warehouseType: '완제품', remark: '', isDefault: true, useYn: 'N' });

    expect(apiPost).toHaveBeenCalledWith('/api/v1/co/master/warehouse', {
      warehouseNm: '냉동창고', warehouseType: '원자재', remark: '', defaultYn: false, useYn: 'Y',
    });
    expect(moved).toBe(4);
    expect(apiPut).toHaveBeenNthCalledWith(1, '/api/v1/co/master/warehouse/1', {
      warehouseNm: '계량실', warehouseType: '원자재', remark: '', useYn: 'Y',
    });
    expect(apiPut).toHaveBeenNthCalledWith(2, '/api/v1/co/master/warehouse/3', {
      warehouseNm: '냉장창고', warehouseType: '완제품', remark: '', defaultYn: true, useYn: 'N',
    });
  });

  it('저장 전 확인: 이름 · 유형 필수, 같은 이름 불가, 기본창고는 전체에서 한 곳, 입고창고는 남아야 함', () => {
    const original = [wh({ id: '1' }), wh({ id: '2', warehouseId: 2, name: '자재창고', isDefault: true })];

    expect(validateWarehouseChanges(original, original, { ...noChanges, updatedRows: [wh({ name: ' ' })] }))
      .toBe('창고 이름을 입력해주세요');
    expect(validateWarehouseChanges(original, original, { ...noChanges, updatedRows: [wh({ warehouseType: '' })] }))
      .toBe('계량창고: 창고유형을 골라주세요');

    const sameName = [wh({ id: '1', name: '자재창고' }), original[1]];
    expect(validateWarehouseChanges(original, sameName, { ...noChanges, updatedRows: [sameName[0]] }))
      .toBe('자재창고: 같은 이름의 창고가 있어요');

    // 유형이 달라도 기본창고는 한 곳만
    const twoDefaults = [wh({ id: '1', warehouseType: '완제품', isDefault: true }), original[1]];
    expect(validateWarehouseChanges(original, twoDefaults, { ...noChanges, updatedRows: [twoDefaults[0]] }))
      .toBe('기본창고는 한 곳만 정할 수 있어요');

    // 기본창고의 유형만 바꾸는 것은 된다
    const retyped = [original[0], wh({ id: '2', warehouseId: 2, name: '자재창고', warehouseType: '부자재', isDefault: true })];
    expect(validateWarehouseChanges(original, retyped, { ...noChanges, updatedRows: [retyped[1]] })).toBeNull();

    // 입고창고(기본창고)를 끄면 막는다
    const off = [original[0], wh({ id: '2', warehouseId: 2, name: '자재창고' })];
    expect(validateWarehouseChanges(original, off, { ...noChanges, updatedRows: [off[1]] })).toBe(LAST_RECEIVING);

    // 새 줄만 기본창고로 두는 것은 막는다(서버는 수정을 먼저 한다)
    const newOnly = [original[0], off[1], wh({ id: 'new-warehouse-1', warehouseId: null, name: '새창고', isDefault: true })];
    expect(validateWarehouseChanges(original, newOnly, { ...noChanges, updatedRows: [off[1]], insertedRows: [newOnly[2]] }))
      .toBe(LAST_RECEIVING);

    // 다른 저장된 창고로 옮기면 통과(유형이 달라도)
    const moveReceiving = [wh({ id: '1', warehouseType: '완제품', isDefault: true }), wh({ id: '2', warehouseId: 2, name: '자재창고' })];
    expect(validateWarehouseChanges(original, moveReceiving, { ...noChanges, updatedRows: moveReceiving })).toBeNull();
  });
});

describe('기초정보 > 창고등록(BSWarehouseView) 기본창고 체크', () => {
  it('다른 창고를 기본으로 켜면 유형과 상관없이 원래 기본창고를 끈다', () => {
    const before = new Map([['1', true], ['2', false], ['3', false]]);
    const after = [
      wh({ id: '1', isDefault: true }),
      wh({ id: '2', warehouseType: '완제품', isDefault: true }),
      wh({ id: '3', warehouseType: '완제품' }),
    ];
    expect(defaultRowsToClear(before, after)).toEqual(['1']);
  });

  it('새로 켠 곳이 없으면(끄기·이름·유형 수정 등) 아무것도 끄지 않는다', () => {
    const before = new Map([['1', true], ['2', false]]);
    expect(defaultRowsToClear(before, [wh({ id: '1', isDefault: true, warehouseType: '부자재' }), wh({ id: '2' })])).toEqual([]);
    expect(defaultRowsToClear(before, [wh({ id: '1' }), wh({ id: '2' })])).toEqual([]);
  });
});

describe('창고등록(BSWarehouseView) 코드 · 조회 조건 · 엑셀 (2026-10-20)', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it('창고등록 화면은 사용안함 줄도 받고, 상태를 줄에 담는다', async () => {
    apiGet.mockResolvedValue({ resultList: [{ warehouseId: 5, warehouseCd: 'WH-FZ', warehouseNm: '냉동', warehouseType: '원자재', defaultYn: 'N', useYn: 'N' }] });
    const rows = await fetchWarehouseRows(true);
    expect(apiGet).toHaveBeenCalledWith('/api/v1/co/master/warehouse?includeUnused=true');
    expect(rows[0]).toMatchObject({ warehouseCd: 'WH-FZ', useYn: 'N' });
    await fetchWarehouseRows();
    expect(apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/warehouse');
  });

  it('창고코드는 등록 · 수정 모두 보내지 않는다(서버가 6자리 숫자로 매김, 2026-10-22)', async () => {
    await createWarehouse({ name: '냉동', warehouseType: '원자재', remark: '', useYn: 'Y' });
    expect(apiPost.mock.calls.at(-1)?.[1]).not.toHaveProperty('warehouseCd');
    apiPut.mockResolvedValue({ moved: 0 });
    await updateWarehouse(3, { name: '냉장', warehouseType: '원자재', remark: '메모', useYn: 'Y' });
    expect(apiPut.mock.calls.at(-1)?.[1]).not.toHaveProperty('warehouseCd');
    expect(apiPut.mock.calls.at(-1)?.[1]).toMatchObject({ remark: '메모' }); // 칸은 없앴지만 설명은 그대로 보낸다
  });

  it('상태를 끈(사용안함) 기본창고만 남으면 입고창고가 없는 것으로 막는다(2026-10-22 상태 체크박스)', () => {
    const receiving = wh({ id: '2', warehouseId: 2, name: '자재창고', isDefault: true });
    const off = { ...receiving, useYn: 'N' };
    expect(validateWarehouseChanges([receiving], [off], { ...noChanges, updatedRows: [off] })).toBe(LAST_RECEIVING);
    expect(validateWarehouseChanges([receiving], [receiving], noChanges)).toBeNull();
  });

  it('조회 조건: 창고명 포함 + 상태(코드로는 찾지 않는다)', () => {
    const rows = [wh({ id: '1', warehouseCd: 'WH-RM', name: '원료창고', useYn: 'Y' }), wh({ id: '2', warehouseCd: 'WH-OLD', name: '옛창고', useYn: 'N' })];
    expect(filterWarehouseRows(rows, '', 'ALL').length).toBe(2);
    expect(filterWarehouseRows(rows, '', 'Y').map((r) => r.id)).toEqual(['1']);
    expect(filterWarehouseRows(rows, '', 'N').map((r) => r.id)).toEqual(['2']);
    expect(filterWarehouseRows(rows, '원료', 'ALL').map((r) => r.id)).toEqual(['1']);
    expect(filterWarehouseRows(rows, 'wh-rm', 'ALL').length).toBe(0);
    expect(filterWarehouseRows(rows, '옛', 'Y').length).toBe(0);
  });

  it('엑셀 칸: 그리드와 같은 차례, 기본창고 · 상태는 글자', () => {
    // 2026-10-22 창고유형 칸은 숨겨 엑셀에서도 뺐고, 송연 원본의 설명 · 두고 있는 원재료를 되살렸다
    expect(WAREHOUSE_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['창고명', '기본창고', '설명', '두고 있는 원재료', '상태', '등록자', '등록일시', '수정자', '수정일시']);
    const state = WAREHOUSE_EXCEL_COLUMNS.find((c) => c.label === '상태')?.key as (row: WarehouseRow) => unknown;
    expect(state(wh({ useYn: 'N' }))).toBe('사용안함');
  });
});
