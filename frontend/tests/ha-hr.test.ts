import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_EXCEL_COLUMNS, accountCountText, accountRows, permissionText, emptyHrForm, filterPeople, hrFormOf, leaveDays, leaveDetailTitle, leaveKindText, leavePeopleOptions, pickRows,
  residentNoAlert, trimForm, type HrEmployee, type LeaveDetail, type LeaveSummary,
} from '../src/pages/ha/hr/utils/hr';

const emp = (id: number, name: string, extra: Partial<HrEmployee> = {}): HrEmployee =>
  ({ id, name, hasLogin: false, hasResidentNo: false, ...extra });

const people = [
  emp(1, '관리자', { department: '영업', username: 'admin', hasLogin: true }),
  emp(2, '김연구', { department: '연구소' }),
  emp(3, '박퇴사', { department: '연구소', resignDate: '2026-09-30', username: 'park', hasLogin: true }),
  emp(4, 'Lee', { department: '품질관리', username: 'lee', hasLogin: true }),
];

describe('사원관리(송연 32-hr.js)', () => {
  it('이름 · 부서로 찾기(대소문자 무시), 퇴사자 숨기기', () => {
    expect(filterPeople(people, '', true).map((e) => e.id)).toEqual([1, 2, 4]);
    expect(filterPeople(people, '연구', false).map((e) => e.id)).toEqual([2, 3]);
    expect(filterPeople(people, 'lee', true).map((e) => e.id)).toEqual([4]);
  });

  it('고치기 창에는 가린 주민번호를 넣고, 저장 전에 앞뒤 공백을 뗀다', () => {
    const f = hrFormOf(emp(2, '김연구', { residentNoMasked: '900101-1******', hireDate: '2026-03-15' }));
    expect(f.residentNo).toBe('900101-1******');
    expect(f.hireDate).toBe('2026-03-15');
    expect(trimForm({ ...emptyHrForm(), name: ' 김연구 ', phone: ' 010 ' })).toMatchObject({ name: '김연구', phone: '010' });
  });

  it('주민번호 전체보기 알림: 앞 6 - 뒤 7, 기록이 남는다는 안내', () => {
    expect(residentNoAlert('9001011234567')).toBe('900101-1234567\n\n누가 언제 봤는지 서버에 남았어요.');
  });
});

describe('근태관리(송연 35-leave.js)', () => {
  it('일수 글자: 정수는 그대로, 반차는 소수 한 자리, 종류', () => {
    expect(leaveDays(15)).toBe('15');
    expect(leaveDays(13.5)).toBe('13.5');
    expect(leaveDays(-0.5)).toBe('-0.5');
    expect(leaveDays(null)).toBe('0');
    expect(leaveKindText(0.5)).toBe('반차');
    expect(leaveKindText(1)).toBe('연차');
  });

  it('연차 등록 창 사원: 퇴사자는 빼고(입사일 없는 사람은 남김) 부서 · 이름', () => {
    const rows: LeaveSummary[] = [
      { employeeId: '0000', name: '관리자', department: '영업', countable: true },
      { employeeId: '00000001', name: '김연구', countable: false, reason: '입사일이 없어요' },
      { employeeId: '00000002', name: '박퇴사', resignDate: '2026-09-30', countable: true },
    ];
    expect(leavePeopleOptions(rows)).toEqual([{ value: '0000', label: '영업 · 관리자' }, { value: '00000001', label: '김연구' }]);
  });

  it('상세 제목', () => {
    const d = { employeeId: '00000001', name: '김연구', countable: true, yearStart: '2026-03-15', yearEnd: '2027-03-14', yearsOfService: 0, date: '2026-10-14', rows: [], earlierRows: [] } as LeaveDetail;
    expect(leaveDetailTitle(d)).toBe('김연구 — 2026-03-15 ~ 2027-03-14 (0년차)');
  });
});

describe('로그인계정관리(송연 17-employee.js)', () => {
  it('아이디가 있고 그만두지 않은 사람만, 아이디로도 찾기, 개수 글자', () => {
    expect(accountRows(people, '').map((e) => e.id)).toEqual([1, 4]);
    expect(accountRows(people, 'adm').map((e) => e.id)).toEqual([1]);
    expect(accountCountText(people, 2)).toBe('계정 2개 · 아이디 없는 사원 1명');
    expect(accountCountText([people[0]], 1)).toBe('계정 1개');
  });

  it('권한 칸은 보여주기만: N개 화면 / 없음, 엑셀에 권한개수 · 구분', () => {
    expect(permissionText(emp(1, '관리자', { permissionCount: 12, admin: true }))).toBe('12개 화면');
    expect(permissionText(emp(2, '김연구'))).toBe('없음');
    expect(ACCOUNT_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['부서', '이름', '로그인아이디', '권한개수', '구분']);
    const admin = emp(1, '관리자', { permissionCount: 12, admin: true, username: 'admin', hasLogin: true });
    expect(ACCOUNT_EXCEL_COLUMNS.slice(2).map((c) => (typeof c.key === 'function' ? c.key(admin) : admin[c.key]))).toEqual(['admin', 12, '관리자']);
  });

  it('아이디 만들 사람: 아이디가 없고 그만두지 않은 사람', () => {
    expect(pickRows(people, '').map((e) => e.id)).toEqual([2]);
    expect(pickRows(people, '없는').length).toBe(0);
  });
});
