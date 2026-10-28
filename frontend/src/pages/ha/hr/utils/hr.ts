// 인사·회계 > 인사관리 (송연 32-hr.js 사원관리 · 35-leave.js 근태관리 · 17-employee.js 로그인계정관리)
import type { ExcelColumn } from '../../../../shared/utils/excelFile';

export type HrEmployee = {
  id: string; // 사번(예: 0000, 새 사원은 8자리 자동 번호)
  name: string | null;
  department?: string | null;
  position?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  hireDate?: string | null;
  resignDate?: string | null;
  memo?: string | null;
  username?: string | null;
  hasLogin: boolean;
  hasResidentNo: boolean;
  residentNoMasked?: string | null;
  // 송연 원본의 권한(보여주기만. 이 프로그램은 권한을 쓰지 않아 고치지 않는다)
  admin?: boolean;
  permissionCount?: number;
};

export type LeaveSummary = {
  employeeId: string;
  name: string | null;
  department?: string | null;
  position?: string | null;
  hireDate?: string | null;
  resignDate?: string | null;
  countable: boolean;
  reason?: string | null;
  yearsOfService?: number | null;
  yearStart?: string | null;
  yearEnd?: string | null;
  entitledDays?: number | null;
  accruing?: boolean | null;
  usedDays?: number | null;
  remainingDays?: number | null;
};

export type LeaveRecord = { id: number; leaveDate: string; days: number; note?: string | null; createdAt?: string | null; createdBy?: string | null };
export type LeaveDetail = LeaveSummary & { date: string; rows: LeaveRecord[]; earlierRows: LeaveRecord[] };

// 사원 인사정보 입력 칸(송연 hr-modal)
export type HrForm = {
  name: string; department: string; position: string; phone: string; birthDate: string; hireDate: string;
  residentNo: string; address: string; resignDate: string; memo: string;
};
export const emptyHrForm = (): HrForm => ({
  name: '', department: '', position: '', phone: '', birthDate: '', hireDate: '', residentNo: '', address: '', resignDate: '', memo: '',
});
// 고치기: 주민번호 칸에는 가린 값을 넣어둔다. 그대로 저장하면 별표가 섞여 있어 서버가 안 건드린다
export const hrFormOf = (e: HrEmployee): HrForm => ({
  name: e.name || '', department: e.department || '', position: e.position || '', phone: e.phone || '',
  birthDate: e.birthDate || '', hireDate: e.hireDate || '', residentNo: e.residentNoMasked || '', address: e.address || '',
  resignDate: e.resignDate || '', memo: e.memo || '',
});
export const trimForm = (f: HrForm): HrForm =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as HrForm;

// 이름 · 부서로 찾기, 퇴사자 숨기기(사원관리 · 근태관리 공통)
export function filterPeople<T extends { name?: string | null; department?: string | null; resignDate?: string | null }>(rows: T[], q: string, hideResigned: boolean): T[] {
  const k = q.trim().toLowerCase();
  return rows.filter((e) => !(hideResigned && e.resignDate))
    .filter((e) => !k || (e.name || '').toLowerCase().includes(k) || (e.department || '').toLowerCase().includes(k));
}

// 로그인계정관리: 아이디가 있고 그만두지 않은 사람만(계정을 보러 온 화면에 계정 없는 사람이 섞이면 볼 것을 찾느라 지친다)
export function accountRows(rows: HrEmployee[], q: string): HrEmployee[] {
  const k = q.trim().toLowerCase();
  return rows.filter((e) => e.hasLogin && !e.resignDate)
    .filter((e) => !k || (e.name || '').toLowerCase().includes(k) || (e.department || '').toLowerCase().includes(k) || (e.username || '').toLowerCase().includes(k));
}
export const accountCountText = (rows: HrEmployee[], shown: number) => {
  const noLogin = rows.filter((e) => !e.hasLogin && !e.resignDate).length;
  return `계정 ${shown}개${noLogin ? ` · 아이디 없는 사원 ${noLogin}명` : ''}`;
};
// 아이디 만들 사람 고르기: 아직 아이디가 없고 그만두지 않은 사람
export const pickRows = (rows: HrEmployee[], q: string) => filterPeople(rows.filter((e) => !e.hasLogin), q, true);

// 0.5 는 '0.5', 3 은 '3'(반차가 섞이는 자료라 소수점을 늘 붙이면 지저분하다)
export const leaveDays = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
export const leaveKindText = (days: number) => (days === 0.5 ? '반차' : '연차');
export const leaveDetailTitle = (d: LeaveDetail) => `${d.name} — ${d.yearStart} ~ ${d.yearEnd} (${d.yearsOfService}년차)`;

// 연차 등록 창의 사원 고르기: 그만둔 사람은 뺀다(입사일 없는 사람은 남긴다 — 서버가 '입사일부터 넣어주세요' 라고 짚어준다)
export const leavePeopleOptions = (rows: LeaveSummary[]) =>
  rows.filter((e) => !e.resignDate).map((e) => ({ value: e.employeeId, label: `${e.department ? `${e.department} · ` : ''}${e.name || ''}` }));

export const todayText = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 주민번호 전체보기 알림
export const residentNoAlert = (d: string) => `${d.slice(0, 6)}-${d.slice(6)}\n\n누가 언제 봤는지 서버에 남았어요.`;

// ===== 엑셀(송연 downloadRowsAsExcel) =====
// 사원명부: 엑셀에는 가린 주민번호만 넣는다(내려받은 파일이 메일로 돌아다닌다)
export const STAFF_EXCEL_COLUMNS: ExcelColumn<HrEmployee>[] = [
  { key: 'department', label: '부서' }, { key: 'name', label: '이름' }, { key: 'position', label: '직급' },
  { key: 'phone', label: '연락처', width: 15 }, { key: 'birthDate', label: '생년월일' },
  { key: 'residentNoMasked', label: '주민등록번호', width: 16 },
  { key: 'hireDate', label: '입사일' }, { key: 'address', label: '주소', width: 30 }, { key: 'resignDate', label: '퇴사일' },
  { key: (e) => (e.hasLogin ? e.username : ''), label: '로그인아이디' },
];
export const LEAVE_EXCEL_COLUMNS: ExcelColumn<LeaveSummary>[] = [
  { key: 'department', label: '부서' }, { key: 'name', label: '이름' }, { key: 'hireDate', label: '입사일' },
  { key: (e) => `${e.yearsOfService}년차`, label: '근속' },
  { key: 'yearStart', label: '연차연도시작' }, { key: 'yearEnd', label: '연차연도끝' },
  { key: 'entitledDays', label: '연차갯수' }, { key: 'usedDays', label: '사용' }, { key: 'remainingDays', label: '잔여' },
];
// 송연 목록의 '권한' 칸: '관리자' 표시 + 'N개 화면' / '없음'
export const permissionText = (e: HrEmployee) => (e.permissionCount ? `${e.permissionCount}개 화면` : '없음');

// 로그인계정(송연과 같은 칸. 권한은 보여주기만)
export const ACCOUNT_EXCEL_COLUMNS: ExcelColumn<HrEmployee>[] = [
  { key: 'department', label: '부서' }, { key: 'name', label: '이름' },
  { key: (e) => (e.hasLogin ? e.username : ''), label: '로그인아이디', width: 16 },
  { key: (e) => e.permissionCount ?? 0, label: '권한개수' },
  { key: (e) => (e.admin ? '관리자' : ''), label: '구분' },
];
