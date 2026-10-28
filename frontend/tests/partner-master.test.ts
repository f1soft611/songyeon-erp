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
  createClientMaster,
  fetchClientMasterRows,
  fetchClientTypes,
  updateClientMaster,
} from '../src/pages/co/master/partner-master/services/partnerMaster.service';
import {
  CLIENT_EXCEL_COLUMNS,
  clientTypeName,
  PARTNER_LIST_EXCEL_COLUMNS,
} from '../src/pages/co/master/partner-master/components/PartnerMasterGrid';
import {
  clientTypeCodeOf,
  filterClientRows,
  stageClientExcel,
  stageResultText,
  toClientPayload,
  validateClientPayload,
} from '../src/pages/co/master/partner-master/hooks/usePartnerMasterManagement';
import type { ClientMasterForm, ClientMasterRow } from '../src/pages/co/master/partner-master/types/partnerMaster.types';

// 2026-10-27 utils/partnerMaster.ts 를 없애며 시험 안으로 옮긴 빈 거래처 값
const EMPTY_CLIENT_FORM: ClientMasterForm = {
  name: '', clientType: '', businessNo: '', ceoName: '', businessType: '', businessItem: '', phone: '', fax: '',
  mobile: '', email: '', zipcode: '', address: '', addressDetail: '', memo: '', useYn: 'Y',
};
import { readExcelRows } from '../src/shared/utils/excelFile';

// 공통코드 CUSTOMER_CATEGORY(가짜 값)
const TYPE_OPTIONS = [
  { value: '001', label: '매입거래처' },
  { value: '002', label: '매출거래처' },
  { value: '003', label: '매입+매출 거래처' },
];
const clientRow = (id: string, name: string) => ({ id, name } as ClientMasterRow);

describe('거래처마스터(BSPartnerMasterView) 화면 규칙', () => {
  it('분류 이름과 엑셀 양식 칸 순서가 송연과 같다', () => {
    // 2026-10-23 분류는 공통코드 CUSTOMER_CATEGORY 코드로 저장하고, 서버가 이어 준 이름(clientTypeNm)을 보여 준다
    expect(clientTypeName({ clientType: '003', clientTypeNm: '매입+매출 거래처' })).toBe('매입+매출 거래처');
    expect(clientTypeName({ clientType: '009', clientTypeNm: '' })).toBe('009');
    expect(CLIENT_EXCEL_COLUMNS.map((column) => column.label)).toEqual([
      '거래처명', '분류', '사업자등록번호', '대표자명', '업태', '종목', '전화', '팩스', '모바일', 'Email', '우편번호', '주소', '메모', // 2026-10-27 상세주소 칸 뺌
    ]);
  });

  it('거래처명·분류가 비면 화면에서 먼저 막는다', () => {
    expect(validateClientPayload({ ...EMPTY_CLIENT_FORM, name: ' ' })).toBe('거래처명을 입력해주세요');
    expect(validateClientPayload({ ...EMPTY_CLIENT_FORM, name: '태화분식' })).toBe('분류를 선택해주세요');
    expect(validateClientPayload({ ...EMPTY_CLIENT_FORM, name: '태화분식', clientType: '매출' })).toBeNull();
  });

  // 2026-10-27 엑셀 올리기는 바로 저장하지 않고 그리드에 올린다(필수값 · 자릿수는 [저장] 때 그리드가 막는다)
  it('분류 글자는 코드 · 이름 · 예전 글자를 코드로 바꾼다', () => {
    expect(clientTypeCodeOf('001', TYPE_OPTIONS)).toBe('001');
    expect(clientTypeCodeOf('매입', TYPE_OPTIONS)).toBe('001');
    expect(clientTypeCodeOf(' 매출거래처 ', TYPE_OPTIONS)).toBe('002');
    expect(clientTypeCodeOf('매입+매출', TYPE_OPTIONS)).toBe('003');
    expect(clientTypeCodeOf('도매', TYPE_OPTIONS)).toBe('');
    expect(clientTypeCodeOf('', TYPE_OPTIONS)).toBe('');
  });

  it('엑셀 줄: 새 거래처는 새 줄, 표에 보이는 거래처는 값이 있는 칸만 고친다', () => {
    const existing = [clientRow('1', '가나상회'), clientRow('2', '숨은상회')];
    const stage = stageClientExcel(
      [
        ['거래처명', '분류', '사업자등록번호', '대표자명', '업태', '종목', '전화', '팩스', '모바일', 'Email', '우편번호', '주소', '메모'],
        ['가나상회', '', '', '김대표'],
        ['새거래처', '매출', '', '', '', '', '', '', '', '', '1234'],
        ['분류없음'],
        ['새거래처', '매입'],
        ['이상분류', '도매'],
        ['숨은상회', '매입'],
        ['', '', ''],
      ],
      existing,
      TYPE_OPTIONS,
      [existing[0]],
    );
    expect(stage.updates).toEqual([{ id: '1', patch: { ceoName: '김대표' } }]);
    // 우편번호 4자리 · 분류 빈칸도 그대로 올린다([저장] 때 그리드가 막는다)
    expect(stage.inserted).toEqual([
      { useYn: 'Y', name: '새거래처', clientType: '002', zipcode: '1234' },
      { useYn: 'Y', name: '분류없음' },
      { useYn: 'Y', name: '이상분류', clientType: '' },
    ]);
    expect(stage.notes).toHaveLength(3); // 같은 이름 두 번 · 분류 못 찾음 · 지금 조회 조건으로 표에 없는 거래처
    expect(stageResultText(stage)).toMatch(/^엑셀에서 새 거래처 3곳 · 고친 거래처 1곳을 표에 올렸어요/);
  });

  it('엑셀 줄: 제목 줄이 없으면 양식 순서로, 예전 양식의 상세주소 칸도 읽는다', () => {
    expect(stageClientExcel([['다라상회', '매입', '', '', '', '', '', '', '', '', '', '', '메모1']], [], TYPE_OPTIONS).inserted)
      .toEqual([{ useYn: 'Y', name: '다라상회', clientType: '001', memo: '메모1' }]);
    expect(stageClientExcel([['거래처명', '분류', '주소', '상세주소', '메모'], ['마바', '매출', '서울', '3층', '옛 메모']], [], TYPE_OPTIONS).inserted)
      .toEqual([{ useYn: 'Y', name: '마바', clientType: '002', address: '서울', addressDetail: '3층', memo: '옛 메모' }]);
  });

  it('검색은 거래처명 부분 일치', async () => {
    apiGet.mockResolvedValueOnce({ resultList: [{ id: 1, name: '(주) 디에이치식품', clientType: '매출' }, { id: 2, name: '가나상회' }] });
    const rows = await fetchClientMasterRows();
    expect(filterClientRows(rows, { keyword: '디에이치' }).map((row) => row.id)).toEqual(['1']);
    expect(filterClientRows(rows, { keyword: '' }).length).toBe(2);
    // 조회 조건 분류: 값이 같은 것만, 비우면 전체. 거래처명과 함께 걸린다
    expect(filterClientRows(rows, { keyword: '', clientType: '매출' }).map((row) => row.id)).toEqual(['1']);
    expect(filterClientRows(rows, { keyword: '', clientType: '매입' }).length).toBe(0);
    expect(filterClientRows(rows, { keyword: '가나', clientType: '매출' }).length).toBe(0);
    expect(filterClientRows(rows, { keyword: '', clientType: '' }).length).toBe(2);
    expect(toClientPayload(rows[0])).toMatchObject({ name: '(주) 디에이치식품', clientType: '매출', businessNo: '' });
    expect(toClientPayload(rows[0])).not.toHaveProperty('id');
  });
});

describe('거래처마스터(BSPartnerMasterView) 서비스', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPut.mockReset();
  });

  it('등록·수정 경로(삭제는 없다: 사용여부로 내려놓는다)', async () => {
    const form = { ...EMPTY_CLIENT_FORM, name: '태화분식', clientType: '매출' };
    await createClientMaster(form);
    expect(apiPost).toHaveBeenCalledWith('/api/v1/co/master/partner-master', form);
    await updateClientMaster(3, form);
    expect(apiPut).toHaveBeenCalledWith('/api/v1/co/master/partner-master/3', form);
  });
});

describe('엑셀 읽기', () => {
  it('첫 장을 머리줄 포함 글자 그대로 읽는다', async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('거래처');
    sheet.addRow(['거래처명', '분류', '사업자등록번호']);
    sheet.addRow(['가나상회', '매입', '123-45-67891']);
    sheet.addRow(['숫자칸', '매출', 1234567891]);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = { arrayBuffer: async () => buffer } as unknown as File;
    expect(await readExcelRows(file)).toEqual([
      ['거래처명', '분류', '사업자등록번호'],
      ['가나상회', '매입', '123-45-67891'],
      ['숫자칸', '매출', '1234567891'],
    ]);
  });
});

describe('거래처마스터(BSPartnerMasterView) 코드 칸 없앰 · 엑셀 (2026-10-23)', () => {
  it('예전 보기 전용 코드(C- + 표 번호)로는 찾지 않고, 거래처명 · 거래처코드(6자리, 2026-10-27)로 찾는다', () => {
    const rows = [
      { ...EMPTY_CLIENT_FORM, id: '7', clientId: 7, name: '가나상회' },
      { ...EMPTY_CLIENT_FORM, id: '12', clientId: 12, name: '다라식품' },
    ];
    expect(filterClientRows(rows, { keyword: 'c-012' })).toEqual([]);
    expect(filterClientRows(rows, { keyword: '가나' }).map((row) => row.id)).toEqual(['7']);
    // 2026-10-27 검색어는 거래처코드(6자리)로도 찾는다
    expect(filterClientRows([{ ...rows[0], clientCode: '000012' }], { keyword: '0012' }).map((row) => row.id)).toEqual([rows[0].id]);
  });

  it('엑셀 다운로드 칸: 거래처명 · 분류 · 사업자등록번호(그리드와 같은 차례)', () => {
    expect(PARTNER_LIST_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처명', '분류', '사업자등록번호']);
  });
});

describe('거래처마스터 사용여부 칸 (2026-10-23)', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
  });

  it('목록 줄에 사용여부를 담는다(없으면 Y), 등록 · 수정 때 보내는 값에도 넣는다(2026-10-27, S_ERP 거래처관리와 같음)', async () => {
    apiGet.mockResolvedValueOnce({ resultList: [{ id: 1, name: '가', useYn: 'N' }, { id: 2, name: '나' }] });
    const rows = await fetchClientMasterRows();
    expect(rows.map((row) => row.useYn)).toEqual(['N', 'Y']);
    expect(toClientPayload(rows[0])).toMatchObject({ useYn: 'N' });
    expect(toClientPayload(rows[1])).toMatchObject({ useYn: 'Y' });
  });
});

describe('거래처 분류 공통코드 (2026-10-23)', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('목록 줄에 분류 코드와 이름을 담고, 창 값(form)에는 이름을 넣지 않는다', async () => {
    apiGet.mockResolvedValueOnce({ resultList: [{ id: 1, name: '가', clientType: '002', clientTypeNm: '매출거래처' }] });
    const [row] = await fetchClientMasterRows();
    expect(row).toMatchObject({ clientType: '002', clientTypeNm: '매출거래처' });
    expect(toClientPayload(row)).toMatchObject({ clientType: '002' });
    expect(toClientPayload(row)).not.toHaveProperty('clientTypeNm');
  });

  it('분류 고르기 항목은 공통코드에서 받는다', async () => {
    apiGet.mockResolvedValueOnce({ resultList: [{ code: '001', name: '매입거래처' }, { code: '002', name: '매출거래처' }] });
    expect(await fetchClientTypes()).toEqual([{ code: '001', name: '매입거래처' }, { code: '002', name: '매출거래처' }]);
    expect(apiGet).toHaveBeenCalledWith('/api/v1/co/master/partner-master/client-types');
  });

  it('엑셀 양식 · 다운로드의 분류 칸은 이름으로 쓴다(올리기는 서버가 이름 · 코드 · 예전 글자를 받는다)', () => {
    const row = { ...EMPTY_CLIENT_FORM, id: '1', clientId: 1, name: '가', clientType: '001', clientTypeNm: '매입거래처', useYn: 'Y' as const };
    const typeOf = (columns: typeof CLIENT_EXCEL_COLUMNS) => {
      const column = columns.find((c) => c.label === '분류');
      return typeof column?.key === 'function' ? column.key(row) : column ? row[column.key as keyof typeof row] : undefined;
    };
    expect(typeOf(CLIENT_EXCEL_COLUMNS)).toBe('매입거래처');
    expect(typeOf(PARTNER_LIST_EXCEL_COLUMNS)).toBe('매입거래처');
  });
});

describe('거래처마스터 조회 조건 사용여부 (2026-10-23)', () => {
  it('전체 · 사용중(Y) · 사용안함(N)으로 거른다', () => {
    const base = { ...EMPTY_CLIENT_FORM, clientTypeNm: '', clientType: '001' };
    const rows = [
      { ...base, id: '1', clientId: 1, name: '가', useYn: 'Y' as const },
      { ...base, id: '2', clientId: 2, name: '나', useYn: 'N' as const },
    ];
    expect(filterClientRows(rows, { keyword: '', clientType: '', useYn: 'ALL' }).map((row) => row.id)).toEqual(['1', '2']);
    expect(filterClientRows(rows, { keyword: '', clientType: '', useYn: 'Y' }).map((row) => row.id)).toEqual(['1']);
    expect(filterClientRows(rows, { keyword: '', clientType: '', useYn: 'N' }).map((row) => row.id)).toEqual(['2']);
    expect(filterClientRows(rows, { keyword: '', clientType: '' }).map((row) => row.id)).toEqual(['1', '2']); // 넘기지 않으면 전체
  });
});
