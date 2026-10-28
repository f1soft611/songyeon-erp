import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Card, Checkbox, Chip, FormControlLabel, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { downloadExcel, type ExcelColumn } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { todayFileTag } from '../../../shared/utils/excelFile';
import { HrStaffDialog, LeaveDialog, type LeaveTarget, type StaffTarget } from './components/HrDialogs';
import { deleteLeave, fetchEmployees, fetchLeave, fetchLeaveDetail, fetchResidentNo } from './services/hr.service';
import {
  LEAVE_EXCEL_COLUMNS, STAFF_EXCEL_COLUMNS, filterPeople, leaveDays, leaveDetailTitle,
  leaveKindText, residentNoAlert, todayText, type HrEmployee, type LeaveDetail, type LeaveRecord, type LeaveSummary,
} from './utils/hr';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type HrPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
// 2026-10-21 '로그인계정관리' 탭을 뺐다: 계정은 사원 등록 때 함께 만든다(username = 이름, 첫 비밀번호 changeme)
type TabKey = 'staff' | 'attend' | 'cert';
type LeaveRow = LeaveSummary & { key: string };
type RecordRow = LeaveRecord & { key: string };

const MONO = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5 } as const;
const smallBtn = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const ROW_HEIGHT = 38;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: ROW_HEIGHT, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
// 줄 수만큼(많으면 10줄에서 그리드 안 스크롤). 비어도 머리줄 있는 그리드를 두고 빈 표시가 다 들어가는 높이를 준다
const recordGridHeight = (rows: number) => (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(10, rows) * ROW_HEIGHT) + 36;
const dim = (resigned: unknown) => (resigned ? { opacity: 0.55 } : undefined);
const tag = (label: string, color: 'default' | 'warning' = 'default') => (
  <Chip size="small" color={color} variant="outlined" label={label} sx={{ height: 18, fontSize: 10.5, ml: 0.75 }} />
);
const empty = (text = '') => <Box component="span" sx={{ color: 'text.disabled' }}>{text}</Box>;

// 인사·회계 > 인사관리 (송연 #screen-hr · 32-hr.js · 35-leave.js · 17-employee.js · app.py /api/employees · /api/hr/leave)
// 근무하는 사람의 인사정보와, 프로그램에 들어올 아이디를 나눠서 본다. 한 사람의 두 갈래라 한 화면의 탭으로 둔다.
// 권한 구분이 없으므로 누구나 모든 탭을 쓴다(송연은 탭마다 hr · employees 권한, 계정은 관리자만).
export function HrPage({ selectedModule, currentMenuName, content, breadcrumbItems }: HrPageProps) {
  const ask = useAsk('인사관리');
  const [tab, setTab] = useState<TabKey>('staff');
  // 사원(사원관리 목록)
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffQ, setStaffQ] = useState('');
  const [hideResigned, setHideResigned] = useState(true);
  const [staffTarget, setStaffTarget] = useState<StaffTarget | null>(null);
  // 근태(연차)
  const [leaveDate, setLeaveDate] = useState(todayText());
  const [leaveRows, setLeaveRows] = useState<LeaveSummary[] | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveQ, setLeaveQ] = useState('');
  const [leaveHideResigned, setLeaveHideResigned] = useState(true);
  const [detail, setDetail] = useState<LeaveDetail | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<LeaveTarget | null>(null);
  // 로그인계정

  const loadEmployees = useCallback(async (): Promise<HrEmployee[]> => {
    setLoading(true);
    try {
      const rows = await fetchEmployees();
      setEmployees(rows);
      return rows;
    } catch {
      setEmployees([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeave = useCallback(async (date: string) => {
    setLeaveLoading(true);
    try {
      setLeaveRows((await fetchLeave(date || todayText())).rows);
    } catch {
      setLeaveRows([]);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  // 연차 목록은 근태관리 탭을 열 때 가져온다(볼 일이 없는 사람에게까지 미리 물어볼 까닭이 없다)
  useEffect(() => {
    if (tab === 'attend' && leaveRows == null) void loadLeave(leaveDate);
  }, [tab, leaveRows, leaveDate, loadLeave]);

  // ===== 사원관리 =====
  const staffRows = useMemo(() => filterPeople(employees, staffQ, hideResigned), [employees, staffQ, hideResigned]);

  // 주민번호 전체는 눌러야 나온다. 목록을 그리는 것만으로 전 직원 주민번호가 브라우저로 흘러가면 그 PC 가 곧 유출구가 된다
  const showResidentNo = async (e: HrEmployee) => {
    try {
      await ask.alert(residentNoAlert(await fetchResidentNo(e.id)));
    } catch (requestError) {
      await ask.alert(errorText(requestError, '꺼내지 못했어요'));
    }
  };

  const onStaffSaved = () => {
    setStaffTarget(null);
    void loadEmployees();
    setLeaveRows(null); // 입사일 · 퇴사일이 바뀌었을 수 있다. 근태관리 탭을 다시 열 때 새로 받는다
  };

  const staffColumns: F1GridColumn<HrEmployee>[] = [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'department', headerName: '부서', width: 120, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => row.department || empty() },
    {
      field: 'name', headerName: '이름', width: 200, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.name}{row.resignDate && tag(`퇴사 ${row.resignDate}`)}</Box>,
    },
    { field: 'position', headerName: '직급', width: 100, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => row.position || '' },
    { field: 'phone', headerName: '연락처', width: 140, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.phone || ''}</Box> },
    {
      field: 'residentNoMasked', headerName: '주민등록번호', width: 210, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => (row.hasResidentNo ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box component="span" sx={MONO}>{row.residentNoMasked || '******'}</Box>
          <Button size="small" variant="outlined" sx={{ ...smallBtn, fontSize: 10.5, py: 0 }} aria-label={`${row.name} 주민등록번호 전체보기`}
            onClick={(event) => { event.stopPropagation(); void showResidentNo(row); }}>전체보기</Button>
        </Box>
      ) : empty()),
    },
    { field: 'hireDate', headerName: '입사일', width: 110, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.hireDate || ''}</Box> },
    {
      field: 'username', headerName: '로그인', flex: 1, width: 140, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => (row.hasLogin ? <Box component="span" sx={MONO}>{row.username}</Box> : empty('아이디 없음')),
    },
    {
      field: 'memo', headerName: '', width: 90, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setStaffTarget({ employee: row })}>고치기</Button>,
    },
  ];

  // ===== 근태관리 =====
  const shownLeave = useMemo<LeaveRow[]>(
    () => filterPeople(leaveRows || [], leaveQ, leaveHideResigned).map((r) => ({ ...r, key: `l${r.employeeId}` })),
    [leaveRows, leaveQ, leaveHideResigned],
  );

  const openDetail = async (employeeId: string, date = leaveDate) => {
    try {
      setDetail(await fetchLeaveDetail(employeeId, date || todayText()));
    } catch (requestError) {
      await ask.alert(errorText(requestError, '불러오지 못했어요'));
    }
  };

  const searchLeave = () => {
    setDetail(null);
    void loadLeave(leaveDate);
  };

  const afterLeaveChange = async () => {
    const openId = detail?.employeeId ?? null;
    await loadLeave(leaveDate);
    if (openId != null) await openDetail(openId);
  };

  const doDeleteLeave = async (r: LeaveRecord) => {
    if (!(await ask.confirm('이 연차 기록을 지울까요?', true))) return;
    try {
      await deleteLeave(r.id);
    } catch {
      await ask.alert('지우지 못했어요');
      return;
    }
    await afterLeaveChange();
  };

  const leaveCell = (row: LeaveRow, node: ReactNode) => (row.countable ? node : null);
  const leaveColumns: F1GridColumn<LeaveRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'department', headerName: '부서', width: 120, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => row.department || '' },
    {
      field: 'name', headerName: '이름', width: 190, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.name}{row.countable && row.resignDate && tag(`퇴사 ${row.resignDate}`)}</Box>,
    },
    {
      field: 'hireDate', headerName: '입사일', width: 110, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => leaveCell(row, <Box component="span" sx={MONO}>{row.hireDate || ''}</Box>),
    },
    {
      // 셀 수 없으면 그 까닭을 이 자리에 적는다. 0 으로 채우면 '연차가 없는 사람' 으로 읽혀 왜 그런지 알 수 없다
      field: 'yearsOfService', headerName: '근속', width: 130, headerAlign: 'center', align: 'left', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => (row.countable
        ? <Box component="span">{row.yearsOfService}년차{row.accruing && tag('첫 해', 'warning')}</Box>
        : <Box component="span" sx={{ color: 'text.secondary' }}>{row.reason || '셀 수 없어요'}</Box>),
    },
    {
      field: 'yearStart', headerName: '연차연도', width: 200, headerAlign: 'center', align: 'center', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => leaveCell(row, <Box component="span" sx={{ ...MONO, fontSize: 11, color: 'text.secondary' }}>{row.yearStart} ~ {row.yearEnd}</Box>),
    },
    { field: 'entitledDays', headerName: '연차갯수', width: 90, headerAlign: 'center', align: 'right', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => leaveCell(row, <Box component="span" sx={MONO}>{leaveDays(row.entitledDays)}</Box>) },
    { field: 'usedDays', headerName: '사용', width: 80, headerAlign: 'center', align: 'right', getCellStyle: ({ row }) => dim(row.resignDate), renderCell: ({ row }) => leaveCell(row, <Box component="span" sx={MONO}>{leaveDays(row.usedDays)}</Box>) },
    {
      field: 'remainingDays', headerName: '잔여', width: 80, headerAlign: 'center', align: 'right', getCellStyle: ({ row }) => dim(row.resignDate),
      renderCell: ({ row }) => leaveCell(row, <Box component="span" sx={{ ...MONO, fontWeight: 700, color: (row.remainingDays ?? 0) < 0 ? 'error.main' : undefined }}>{leaveDays(row.remainingDays)}</Box>),
    },
    {
      field: 'employeeId', headerName: '', flex: 1, width: 100, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => leaveCell(row, <Button size="small" variant="outlined" sx={smallBtn} onClick={() => void openDetail(row.employeeId)}>상세보기</Button>),
    },
  ];

  const recordColumns: F1GridColumn<RecordRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'leaveDate', headerName: '날짜', width: 120, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.leaveDate}</Box> },
    { field: 'days', headerName: '종류', width: 80, headerAlign: 'center', align: 'center', renderCell: ({ row }) => leaveKindText(row.days) },
    { field: 'id', headerName: '일수', width: 80, headerAlign: 'center', align: 'right', renderCell: ({ row }) => <Box component="span" sx={MONO}>{leaveDays(row.days)}</Box> },
    { field: 'note', headerName: '메모', flex: 1, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.note || empty() },
    { field: 'createdBy', headerName: '넣은 사람', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{row.createdBy || ''}</Box> },
    {
      field: 'createdAt', headerName: '', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void doDeleteLeave(row)}>지우기</Button>,
    },
  ];
  const recordRows = (rows: LeaveRecord[], prefix: string): RecordRow[] => rows.map((r) => ({ ...r, key: `${prefix}${r.id}` }));

  // ===== 엑셀 =====
  const excel = async <T,>(rows: T[], columns: ExcelColumn<T>[], name: string, emptyText = '내려받을 내역이 없어요') => {
    if (rows.length === 0) {
      await ask.alert(emptyText);
      return;
    }
    await downloadExcel(rows, columns, name);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'hr',
      actions: tab === 'staff' ? [
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true, onClick: () => void excel(staffRows, STAFF_EXCEL_COLUMNS, `사원명부_${todayFileTag()}.xlsx`) },
        { label: '사원 등록', icon: AddIcon, visible: true, onClick: () => setStaffTarget({ employee: null }) },
      ] : tab === 'attend' ? [
        { label: '조회', icon: SearchIcon, visible: true, onClick: searchLeave },
        { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: true, onClick: () => void excel(shownLeave.filter((r) => r.countable), LEAVE_EXCEL_COLUMNS, `연차현황_${todayFileTag()}.xlsx`, '내려받을 자료가 없습니다') },
        { label: '연차 등록', icon: AddIcon, visible: true, onClick: () => setLeaveTarget({ people: leaveRows || [], date: leaveDate || todayText() }) },
      ] : [],
    },
  ];

  const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 } as const;
  const searchBox = (value: string, set: (v: string) => void, placeholder: string, width = 200) => (
    <TextField size="small" margin="none" placeholder={placeholder} value={value} onChange={(event) => set(event.target.value)} sx={{ width }}
      slotProps={{ htmlInput: { 'aria-label': placeholder } }} />
  );
  const resignedBox = (checked: boolean, set: (v: boolean) => void) => (
    <FormControlLabel sx={{ ml: 0.5 }} control={<Checkbox size="small" checked={checked} onChange={(event) => set(event.target.checked)} />}
      label={<Typography sx={{ fontSize: 12.5 }}>퇴사자 숨기기</Typography>} />
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => setTab(value)} aria-label="인사관리 탭">
          <Tab value="staff" label="사원관리" />
          <Tab value="attend" label="근태관리" />
          <Tab value="cert" label="증명서신청" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {tab === 'staff' && (
          <Card sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {searchBox(staffQ, setStaffQ, '이름 · 부서 검색')}
              {resignedBox(hideResigned, setHideResigned)}
            </Box>
            <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
              <F1Grid rows={staffRows} columns={staffColumns} rowKey="id" storageKey="ha-hr-staff-grid" ariaLabel="F1-GRID 사원관리" loading={loading} {...gridProps} />
            </Box>
          </Card>
        )}

        {tab === 'attend' && (
          <Card sx={cardSx}>
            {detail == null ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Typography sx={{ fontSize: 12.5 }}>기준일</Typography>
                  <TextField size="small" margin="none" type="date" value={leaveDate} sx={{ width: 160 }} onChange={(event) => setLeaveDate(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchLeave(); } }}
                    slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': '기준일' } }} />
                  {searchBox(leaveQ, setLeaveQ, '이름 · 부서 검색', 180)}
                  {resignedBox(leaveHideResigned, setLeaveHideResigned)}
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.8, mb: 1 }}>
                  입사일 기준으로 셉니다. 1년 미만은 한 달 일할 때마다 하루씩 늘어나고(최대 11일), 1년부터 15일, 3년부터 2년마다 하루씩 더해 최대 25일입니다.
                  {' '}<b>1년 미만인 분은 매달 개근한 것으로 보고 셉니다</b> — 이 프로그램에는 출근 기록이 없어서예요.
                </Typography>
                <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
                  <F1Grid rows={shownLeave} columns={leaveColumns} rowKey="key" storageKey="ha-hr-leave-grid" ariaLabel="F1-GRID 근태관리" loading={leaveLoading} {...gridProps} />
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                  <Button size="small" variant="outlined" onClick={() => setDetail(null)}>← 목록으로</Button>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{leaveDetailTitle(detail)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }} aria-label="연차 요약">
                  {[['연차갯수', detail.entitledDays], ['사용', detail.usedDays], ['잔여', detail.remainingDays]].map(([k, v]) => (
                    <Box key={k as string} sx={{ flex: '0 0 160px', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k}</Typography>
                      <Typography sx={{ fontSize: 20, fontWeight: 700, color: k === '잔여' && Number(v) < 0 ? 'error.main' : undefined }}>{leaveDays(v as number)}</Typography>
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.5 }}>이번 연차연도에 쓴 날</Typography>
                <Box sx={{ height: recordGridHeight(detail.rows.length), mb: 1.5 }}>
                  <F1Grid rows={recordRows(detail.rows, 't')} columns={recordColumns} rowKey="key" storageKey="ha-hr-leave-detail-grid" ariaLabel="F1-GRID 이번 연차연도에 쓴 날" {...gridProps} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.5 }}>그 전에 쓴 날</Typography>
                <Box sx={{ height: recordGridHeight(detail.earlierRows.length) }}>
                  <F1Grid rows={recordRows(detail.earlierRows, 'e')} columns={recordColumns} rowKey="key" storageKey="ha-hr-leave-earlier-grid" ariaLabel="F1-GRID 그 전에 쓴 날" {...gridProps} />
                </Box>
              </>
            )}
          </Card>
        )}

        {tab === 'cert' && (
          // 증명서신청은 송연에서도 아직 만들지 않았다(2026-09-09 관리부). 빈 화면 대신 무엇이 필요한지 적어둔다 — 아무 말 없이 비어 있으면 고장으로 읽힌다
          <Card sx={{ ...cardSx, flex: '0 0 auto', p: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>증명서신청 — 아직 만들지 않았어요</Typography>
            <Typography component="div" sx={{ fontSize: 12.5, lineHeight: 1.9 }}>
              재직증명서·경력증명서를 신청하고 받는 곳이에요.
              {' '}<b>사내 게시판을 만들어 양식을 올려두고, 작성하면 담당자에게 전달되는 방식으로 정했습니다</b>
              {' '}(2026-09-09 관리부). 사원관리에 주민등록번호를 넣어뒀으니 찍을 자료는 준비됐습니다. 아직 정하지 않은 것:
              <Box component="ul" sx={{ m: '8px 0 0 18px', p: 0 }}>
                <li>증명서 양식 (회사 직인·대표자명이 들어간 종이 모양)</li>
                <li>주민번호를 통째로 찍을지, 생년월일만 찍을지</li>
                <li>게시판을 증명서에만 쓸지, 공지사항까지 함께 올릴지</li>
              </Box>
            </Typography>
          </Card>
        )}

      </Box>
      <HrStaffDialog target={staffTarget} onClose={() => setStaffTarget(null)} onSaved={onStaffSaved} />
      <LeaveDialog target={leaveTarget} onClose={() => setLeaveTarget(null)} onSaved={() => { setLeaveTarget(null); void afterLeaveChange(); }} />
      {ask.node}
    </Box>
  );
}
