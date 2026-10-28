import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Card, Checkbox, Chip, FormControlLabel, Link, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadAttachment, type AttachmentFile } from '../../../shared/services/attachment.service';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ReceivingDialog } from './components/ReceivingDialog';
import { ReturnDialog } from './components/ReturnDialog';
import { DocDetailDialog, DocUploadDialog, DocViewDialog } from './components/ReceivingDocDialogs';
import { cancelReceiving, fetchReceivings, fetchReceivingSummary, type ReceivingQuery } from './services/receiving.service';
import {
  DOC_EXCEL_COLUMNS, HISTORY_EXCEL_COLUMNS, IN_STATUS_EXCEL_COLUMNS, RETURN_EXCEL_COLUMNS,
  filesOfMaterial, formatMoney, formatQty, materialWithCode, monthStart, noPriceRows, rowsOfMaterial, sortInStatus, sumOf, toInStatusRows,
  type InStatusRow, type Receiving, type ReceivingSummary,
} from './utils/receiving';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type ReceivingPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type TabKey = 'register' | 'instatus' | 'doc' | 'return';
type Kind = '' | 'receiving' | 'return';
type InQuery = { start: string; end: string; clientQ: string; materialQ: string; kind: Kind };
type DocQuery = { start: string; end: string; clientQ: string; materialQ: string };
type StatusRow = InStatusRow & { materialKey: string };
type DocRow = ReceivingSummary & { key: string; fileCount: number };
// 2026-10-26 입고내역 · 반품내역은 줄을 골라 [삭제](오른쪽 클릭 [행 삭제])로 표에서 빼고 [저장] 때 지운다(예전 줄 끝 [취소])
type DeleteKind = 'receiving' | 'return';

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const money = (value: number | null | undefined) => (value != null ? formatMoney(value) : '');
const red = { color: 'error.main' } as const;

// 붙어있는 서류를 내려받기 링크로(송연 attachmentLinksHTML)
function FileLinks({ files, onError }: { files?: AttachmentFile[]; onError: (text: string) => void }) {
  if (!files || files.length === 0) return <Typography component="span" variant="body2" color="text.secondary">-</Typography>;
  return (
    <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, overflow: 'hidden' }}>
      {files.map((file) => (
        <Link key={file.id} component="button" type="button" underline="always" title={file.origName} sx={{ fontSize: 11.5, whiteSpace: 'nowrap' }}
          onClick={() => downloadAttachment(file).catch((requestError) => onError(errorText(requestError, '내려받지 못했어요')))}>
          📎 {file.origName}
        </Link>
      ))}
    </Box>
  );
}

// 구매관리 > 입고관리 (송연 #screen-recv · 19-purchase.js · 37-recv-status.js)
// 탭 네 개: 입고등록(그날 입고내역 + 입고 등록 창) · 입고현황(기간 안에 들어온 것을 한 줄씩, 반품 포함)
//          · 서류등록(품목별로 묶어 입고 건마다 서류를 붙인다) · 반품등록(반품내역 + 반품 등록 창).
export function ReceivingPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReceivingPageProps) {
  const [tab, setTab] = useState<TabKey>('register');
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // ===== 2026-10-26 입고내역 · 반품내역 [삭제] · [저장] =====
  const historyGridRef = useRef<F1GridRef<Receiving>>(null);
  const returnGridRef = useRef<F1GridRef<Receiving>>(null);
  const [historyVersion, setHistoryVersion] = useState(0); // 다시 조회하면 표를 새로 그려 '지운 줄' 기록도 비운다
  const [retVersion, setRetVersion] = useState(0);
  const [historyDirty, setHistoryDirty] = useState(false);
  const [retDirty, setRetDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: DeleteKind; count: number } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);
  // 이번에 이미 지운 줄(저장 도중 오류가 나도 또 지우지 않게)
  const deletedIdsRef = useRef<Set<number>>(new Set());
  const gridOf = (kind: DeleteKind) => (kind === 'receiving' ? historyGridRef : returnGridRef);
  const removedRows = (kind: DeleteKind) =>
    (gridOf(kind).current?.getChanges().deletedRows ?? []).filter((row) => !deletedIdsRef.current.has(row.id));
  const refreshDirty = (kind: DeleteKind) => (kind === 'receiving' ? setHistoryDirty : setRetDirty)(removedRows(kind).length > 0);

  // ===== 입고등록 탭 =====
  const historyRequestRef = useRef(0);
  const [historyDate, setHistoryDate] = useState(() => todayDash());
  const [historyClient, setHistoryClient] = useState('');
  const [history, setHistory] = useState<Receiving[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // 반품은 반품등록 탭에서 따로 본다
  const loadHistory = useCallback(async (date: string, clientQ: string) => {
    const requestId = ++historyRequestRef.current;
    setHistoryLoading(true);
    try {
      const list = await fetchReceivings({ date, clientQ, kind: 'receiving' });
      if (requestId === historyRequestRef.current) {
        setHistory(list);
        setHistoryDirty(false);
        setHistoryVersion((previous) => previous + 1);
      }
    } catch (requestError) {
      if (requestId === historyRequestRef.current) setAlertText(errorText(requestError, '입고내역을 불러오지 못했어요'));
    } finally {
      if (requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(todayDash(), '');
  }, [loadHistory]);

  const exportList = async (query: ReceivingQuery, columns: typeof HISTORY_EXCEL_COLUMNS, name: string, sheet: string) => {
    try {
      const list = await fetchReceivings(query);
      await downloadExcel(list, columns, `${name}${query.date ? `_${query.date}` : ''}.xlsx`, sheet);
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const historyColumns = useMemo<F1GridColumn<Receiving>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'clientName', headerName: '거래처', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'materialName', headerName: '원재료', flex: 1.4, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => materialWithCode(row) },
    {
      field: 'barcode', headerName: '바코드', width: 130, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.barcode || ''}</Box>,
    },
    { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty) },
    { field: 'taxType', headerName: '과세', width: 76, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.taxType || '과세'} /> },
    { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.unitPrice) },
    { field: 'supplyAmount', headerName: '공급가액', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.supplyAmount) },
    { field: 'vatAmount', headerName: '부가세', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.vatAmount) },
    {
      field: 'totalAmount', headerName: '합계', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => money(row.totalAmount), getCellStyle: () => ({ fontWeight: 700 }),
    },
    { field: 'files', headerName: '서류', flex: 1, width: 180, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <FileLinks files={row.files} onError={setAlertText} /> },
  ], []);

  // ===== 입고현황 탭 =====
  const inRequestRef = useRef(0);
  const [inQuery, setInQuery] = useState<InQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '', kind: '' }));
  const inQueryRef = useRef(inQuery);
  inQueryRef.current = inQuery;
  const [inRows, setInRows] = useState<Receiving[] | null>(null);
  const [inLoading, setInLoading] = useState(false);

  const loadInStatus = useCallback(async (override?: Partial<InQuery>) => {
    const query = { ...inQueryRef.current, ...override };
    if (!query.start || !query.end) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++inRequestRef.current;
    setInLoading(true);
    try {
      const list = await fetchReceivings(query);
      if (requestId === inRequestRef.current) setInRows(list);
    } catch (requestError) {
      if (requestId === inRequestRef.current) setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === inRequestRef.current) setInLoading(false);
    }
  }, []);

  // 품목 칸은 날짜·거래처 안에서 같은 품목끼리 묶되, 입고와 반품은 따로 묶는다('반품' 딱지가 어느 줄 것인지 보이게)
  const statusRows = useMemo<StatusRow[]>(
    () => toInStatusRows(inRows ?? []).map((row) => ({ ...row, materialKey: `${row.materialName || ''}|${row.isReturn ? 1 : 0}` })),
    [inRows],
  );
  const noPrice = noPriceRows(inRows ?? []);

  const exportInStatus = async () => {
    if (!inRows || inRows.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const { start, end } = inQueryRef.current;
    await downloadExcel(sortInStatus(inRows), IN_STATUS_EXCEL_COLUMNS, `입고현황_${start}_${end}.xlsx`, '입고현황');
  };

  const changeIn = (key: keyof InQuery) => (event: { target: { value: string } }) =>
    setInQuery((current) => ({ ...current, [key]: event.target.value }));

  const statusColumns = useMemo<F1GridColumn<StatusRow>[]>(() => {
    const returnColor = ({ row }: { row: StatusRow }) => (row.isReturn ? { color: '#dc2626' } : undefined);
    return [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      { field: 'receiveDate', headerName: '입고일자', width: 110, headerAlign: 'center', align: 'center', mergeRows: true },
      {
        field: 'clientName', headerName: '거래처', width: 160, headerAlign: 'center', align: 'left', mergeRows: true,
        renderCell: ({ row }) => (
          <span>
            {row.clientName || ''}
            {row.groupCount > 1 && <Typography component="span" variant="caption" color="text.secondary"> {row.groupCount}건</Typography>}
          </span>
        ),
      },
      // 덩어리의 값이라 거래처 칸과 같은 높이로 묶는다. 모든 줄에 단가가 없으면 0 이 아니라 빈칸
      {
        field: 'subtotal', headerName: '거래처 소계', width: 120, headerAlign: 'center', align: 'right', mergeRows: true,
        renderCell: ({ row }) => money(row.subtotal), getCellStyle: () => ({ fontWeight: 700 }),
      },
      {
        field: 'materialKey', headerName: '입고품목', flex: 1.3, width: 200, headerAlign: 'center', align: 'left', mergeRows: true,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
            <span>{row.materialName || ''}</span>
            {row.isReturn ? <Chip size="small" color="error" variant="outlined" label="반품" /> : null}
          </Box>
        ),
      },
      { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty), getCellStyle: returnColor },
      { field: 'taxType', headerName: '과세', width: 70, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.taxType || '' },
      { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.unitPrice) },
      { field: 'supplyAmount', headerName: '공급가액', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.supplyAmount) },
      { field: 'vatAmount', headerName: '부가세', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.vatAmount) },
      {
        field: 'totalAmount', headerName: '합계금액', width: 120, headerAlign: 'center', align: 'right',
        renderCell: ({ row }) => money(row.totalAmount), getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.isReturn ? { color: '#dc2626' } : {}) }),
      },
    ];
  }, []);

  // ===== 서류등록 탭 =====
  const docRequestRef = useRef(0);
  const [docQuery, setDocQuery] = useState<DocQuery>(() => ({ start: monthStart(), end: todayDash(), clientQ: '', materialQ: '' }));
  const docQueryRef = useRef(docQuery);
  docQueryRef.current = docQuery;
  const [docSummary, setDocSummary] = useState<ReceivingSummary[] | null>(null);
  const [docFiles, setDocFiles] = useState<Receiving[]>([]); // 그 기간의 입고줄(+붙어있는 서류)
  const [docLoading, setDocLoading] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ code: string; name: string } | null>(null);
  const [viewTarget, setViewTarget] = useState<{ code: string; name: string } | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ code: string; name: string } | null>(null);
  const [detailQuery, setDetailQuery] = useState<DocQuery>(docQuery);

  // 서류는 입고 한 줄 한 줄에 붙어있다. 품목별 표에 서류칸을 그리려면 그 기간의 입고줄을 같이 받아둬야 한다
  const loadDocFiles = useCallback(async (query: DocQuery) => {
    setDocFiles(await fetchReceivings({ start: query.start, end: query.end, clientQ: query.clientQ, kind: 'receiving' }));
  }, []);

  const loadDoc = useCallback(async () => {
    const query = docQueryRef.current;
    if (!query.start || !query.end) {
      setAlertText('조회 기간을 선택해주세요');
      return;
    }
    const requestId = ++docRequestRef.current;
    setDocLoading(true);
    try {
      const summary = await fetchReceivingSummary(query.start, query.end, query.clientQ, query.materialQ);
      await loadDocFiles(query);
      if (requestId === docRequestRef.current) setDocSummary(summary);
    } catch (requestError) {
      if (requestId === docRequestRef.current) setAlertText(errorText(requestError, '조회에 실패했어요'));
    } finally {
      if (requestId === docRequestRef.current) setDocLoading(false);
    }
  }, [loadDocFiles]);

  // 올리거나 지운 뒤 서류만 다시 받는다(열려있는 창도 같이 바뀐다)
  const refreshDocFiles = useCallback(async () => {
    try {
      await loadDocFiles(docQueryRef.current);
    } catch (requestError) {
      setAlertText(errorText(requestError, '서류 목록을 다시 불러오지 못했어요'));
    }
  }, [loadDocFiles]);

  const docRows = useMemo<DocRow[]>(() => (docSummary ?? [])
    .map((row) => ({ ...row, key: row.materialCode, fileCount: filesOfMaterial(docFiles, row.materialCode).length }))
    .filter((row) => !missingOnly || row.fileCount === 0), [docSummary, docFiles, missingOnly]);

  const exportDoc = async () => {
    if (!docSummary || docSummary.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const { start, end } = docQueryRef.current;
    await downloadExcel(docSummary, DOC_EXCEL_COLUMNS, `입고현황_${start}~${end}.xlsx`, '서류등록');
  };

  const changeDoc = (key: keyof DocQuery) => (event: { target: { value: string } }) =>
    setDocQuery((current) => ({ ...current, [key]: event.target.value }));

  const docColumns = useMemo<F1GridColumn<DocRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'materialName', headerName: '원재료', flex: 1.4, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'entryCount', headerName: '입고건수', width: 100, headerAlign: 'center', align: 'right' },
    {
      field: 'totalQty', headerName: '총 입고수량', width: 130, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => formatQty(row.totalQty), getCellStyle: () => ({ fontWeight: 700 }),
    },
    {
      field: 'fileCount', headerName: '서류', width: 260, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => {
        const target = { code: row.materialCode, name: row.materialName || '' };
        return (
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11.5 }} onClick={() => setUploadTarget(target)}>📎 서류등록</Button>
            {row.fileCount
              ? <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11.5 }} onClick={() => setViewTarget(target)}>📄 서류보기 ({row.fileCount})</Button>
              : <Typography component="span" variant="body2" color="text.secondary">아직 없음</Typography>}
          </Box>
        );
      },
    },
    {
      field: 'materialCode', headerName: '', width: 100, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }}
          onClick={() => { setDetailQuery(docQueryRef.current); setDetailTarget({ code: row.materialCode, name: row.materialName || '' }); }}>
          상세보기
        </Button>
      ),
    },
  ], []);

  // ===== 반품등록 탭 =====
  const retRequestRef = useRef(0);
  const [retDate, setRetDate] = useState(() => todayDash());
  const [retClient, setRetClient] = useState('');
  const [returns, setReturns] = useState<Receiving[] | null>(null);
  const [retLoading, setRetLoading] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const loadReturns = useCallback(async (date: string, clientQ: string) => {
    const requestId = ++retRequestRef.current;
    setRetLoading(true);
    try {
      const list = await fetchReceivings({ date, clientQ, kind: 'return' });
      if (requestId === retRequestRef.current) {
        setReturns(list);
        setRetDirty(false);
        setRetVersion((previous) => previous + 1);
      }
    } catch (requestError) {
      if (requestId === retRequestRef.current) setAlertText(errorText(requestError, '반품내역을 불러오지 못했어요'));
    } finally {
      if (requestId === retRequestRef.current) setRetLoading(false);
    }
  }, []);

  const returnColumns = useMemo<F1GridColumn<Receiving>[]>(() => [
    { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'receiveDate', headerName: '반품일', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'clientName', headerName: '거래처', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'materialName', headerName: '원재료', flex: 1.4, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => materialWithCode(row) },
    { field: 'qty', headerName: '수량', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.qty), getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }) },
    { field: 'taxType', headerName: '과세', width: 76, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Chip size="small" variant="outlined" label={row.taxType || '과세'} /> },
    { field: 'unitPrice', headerName: '단가', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.unitPrice) },
    { field: 'supplyAmount', headerName: '공급가액', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.supplyAmount) },
    { field: 'vatAmount', headerName: '부가세', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => money(row.vatAmount) },
    {
      field: 'totalAmount', headerName: '합계', width: 120, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => money(row.totalAmount), getCellStyle: () => ({ color: '#dc2626', fontWeight: 700 }),
    },
    { field: 'returnReason', headerName: '사유', flex: 1, width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.returnReason || '' },
  ], []);

  // ===== 공통 =====
  // 저장하지 않은 삭제가 있으면 먼저 묻고 한다([조회] · 탭 옮기기)
  const guard = (kind: DeleteKind | null, action: () => void) => {
    if (kind && removedRows(kind).length > 0) {
      setConfirmLeave(() => action);
      return;
    }
    action();
  };
  const currentKind = (): DeleteKind | null => (tab === 'register' ? 'receiving' : tab === 'return' ? 'return' : null);

  const removeSelected = (kind: DeleteKind) => {
    const grid = gridOf(kind).current;
    if ((grid?.getSelectedRows() ?? []).length === 0) {
      setAlertText(kind === 'return' ? '지울 반품 줄을 먼저 골라주세요(줄을 누르면 골라집니다)' : '지울 입고 줄을 먼저 골라주세요(줄을 누르면 골라집니다)');
      return;
    }
    grid?.deleteSelectedRows();
  };

  const askSave = (kind: DeleteKind) => {
    const count = removedRows(kind).length;
    if (count > 0) setConfirmDelete({ kind, count });
  };

  // 뺀 줄을 차례대로 지운다(서버 규칙은 예전 [취소] 와 같다). 거절되면 거기서 멈추고 알린 뒤 다시 조회한다
  const saveAll = async (kind: DeleteKind) => {
    const targets = removedRows(kind);
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const row of targets) {
        try {
          await cancelReceiving(row.id);
          deletedIdsRef.current.add(row.id);
        } catch (requestError) {
          setAlertText(errorText(requestError, '지우지 못했어요'));
          break;
        }
      }
      if (targets.every((row) => deletedIdsRef.current.has(row.id))) setNotice('저장되었습니다');
      // 반품을 지우면 원래 입고의 '반품된 양' 도 바뀌므로 입고내역도 다시 부른다
      if (kind === 'return') await loadReturns(retDate, retClient);
      await loadHistory(historyDate, historyClient);
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (next: TabKey) => guard(currentKind(), () => {
    setTab(next);
    // 송연과 같이 탭을 열 때마다 다시 부른다
    if (next === 'instatus') void loadInStatus();
    if (next === 'doc') void loadDoc();
    if (next === 'return') void loadReturns(retDate, retClient);
  });

  const canRead = Boolean(selectedMenuPermissions?.read);
  const canExcel = Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read);
  const readGroup = (loading: boolean, onSearch: () => void, onExcel: () => void): PermissionActionGroupDefinition => ({
    key: 'read',
    actions: [
      { label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: onSearch },
      { label: '엑셀 다운로드', icon: FileDownloadIcon, visible: canExcel, onClick: onExcel },
    ],
  });
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const deleteActions = (kind: DeleteKind, dirty: boolean) => [
    { label: '삭제', icon: DeleteIcon, visible: canDelete, disabled: saving, onClick: () => removeSelected(kind) },
    { label: '저장', icon: SaveIcon, visible: canDelete, disabled: saving || !dirty, onClick: () => askSave(kind) },
  ];
  const pageActionGroups: PermissionActionGroupDefinition[] = {
    register: [
      readGroup(historyLoading, () => guard('receiving', () => void loadHistory(historyDate, historyClient)),
        () => void exportList({ date: historyDate, kind: 'receiving' }, HISTORY_EXCEL_COLUMNS, '입고내역', '입고내역')),
      {
        key: 'write',
        actions: [
          { label: '입고 등록', icon: NoteAddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => setRegisterOpen(true) },
          ...deleteActions('receiving', historyDirty),
        ],
      },
    ],
    instatus: [readGroup(inLoading, () => void loadInStatus(), () => void exportInStatus())],
    doc: [readGroup(docLoading, () => void loadDoc(), () => void exportDoc())],
    return: [
      readGroup(retLoading, () => guard('return', () => void loadReturns(retDate, retClient)),
        () => void exportList({ date: retDate, kind: 'return' }, RETURN_EXCEL_COLUMNS, '반품내역', '반품내역')),
      {
        key: 'write',
        actions: [
          { label: '반품 등록', icon: NoteAddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => setReturnOpen(true) },
          ...deleteActions('return', retDirty),
        ],
      },
    ],
  }[tab];

  const dateField = (value: string, onChange: (value: string) => void, label: string) => (
    <TextField
      type="date" size="small" margin="none" value={value} onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { 'aria-label': label } }} sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
    />
  );
  const periodFields = (start: string, end: string, onStart: (v: string) => void, onEnd: (v: string) => void) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {dateField(start, onStart, '시작일')}
      <Typography variant="body2" color="text.secondary">~</Typography>
      {dateField(end, onEnd, '종료일')}
    </Box>
  );
  const textField = (value: string, onChange: (event: { target: { value: string } }) => void, label: string, main = false) => (
    <TextField
      size="small" margin="none" placeholder={label} value={value} onChange={onChange}
      slotProps={{ htmlInput: { 'aria-label': label } }}
      sx={(theme) => (main ? { width: '100%', ...searchFieldSx(theme) } : { width: { xs: '100%', sm: 180 }, ...sideFieldSx(theme) })}
    />
  );

  const uploadRows = uploadTarget ? rowsOfMaterial(docFiles, uploadTarget.code) : [];
  const viewRows = viewTarget ? rowsOfMaterial(docFiles, viewTarget.code) : [];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => switchTab(value)} aria-label="입고관리 탭">
          <Tab value="register" label="입고등록" />
          <Tab value="instatus" label="입고현황" />
          <Tab value="doc" label="서류등록" />
          <Tab value="return" label="반품등록" />
        </Tabs>
      </Box>

      {tab === 'register' && (
        <>
          <PageSearchArea
            searchField={textField(historyClient, (event) => setHistoryClient(event.target.value), '거래처 검색', true)}
            onDefaultSearch={() => guard('receiving', () => void loadHistory(historyDate, historyClient))}
          >
            {dateField(historyDate, setHistoryDate, '입고일')}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>입고내역</Typography>
                {history && !historyLoading && history.length === 0 && <Typography variant="body2" color="text.secondary">입고내역이 없습니다</Typography>}
                <Typography sx={{ ml: 'auto', fontSize: 14 }} aria-label="입고 합계금액">
                  합계금액 <b>{formatMoney(sumOf(history ?? [], 'totalAmount'))}</b>원
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* 2026-10-26 오른쪽 클릭 [행 삭제]: 표에서 빼 두고 [저장] 때 지운다 */}
                <F1Grid key={historyVersion} ref={historyGridRef} rows={history ?? []} columns={historyColumns} rowKey="id" storageKey="pu-recv-history-grid" ariaLabel="F1-GRID 입고내역"
                  loading={historyLoading} {...gridProps}
                  allowDeleteRowInContextMenu={canDelete} selectRowOnContextMenu onChangesChange={() => refreshDirty('receiving')} />
              </Box>
            </Card>
          </Box>
        </>
      )}

      {tab === 'instatus' && (
        <>
          <PageSearchArea
            searchField={textField(inQuery.materialQ, changeIn('materialQ'), '원재료명 검색', true)}
            onDefaultSearch={() => void loadInStatus()}
          >
            {textField(inQuery.clientQ, changeIn('clientQ'), '거래처명 검색')}
            <TextField
              select size="small" margin="none" value={inQuery.kind}
              onChange={(event) => {
                const kind = event.target.value as Kind;
                setInQuery((current) => ({ ...current, kind }));
                // 송연과 같이 고르면 바로 다시 부른다
                void loadInStatus({ kind });
              }}
              slotProps={{ htmlInput: { 'aria-label': '입고·반품 구분' }, select: { displayEmpty: true } }}
              sx={(theme) => ({ width: { xs: '100%', sm: 160 }, ...sideFieldSx(theme) })}
            >
              <MenuItem value="">입고·반품 전부</MenuItem>
              <MenuItem value="receiving">입고만</MenuItem>
              <MenuItem value="return">반품만</MenuItem>
            </TextField>
            {periodFields(inQuery.start, inQuery.end, (start) => setInQuery((c) => ({ ...c, start })), (end) => setInQuery((c) => ({ ...c, end })))}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              {noPrice > 0 && (
                <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                  단가가 없어 금액이 비어 있는 줄이 {noPrice}건 있어요. 아래 소계·합계에는 그만큼 빠져 있습니다.
                </Alert>
              )}
              {inRows && !inLoading && inRows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 기간에 들어온 것이 없습니다</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <F1Grid rows={statusRows} columns={statusColumns} rowKey="id" storageKey="pu-recv-instatus-grid" ariaLabel="F1-GRID 입고현황"
                  loading={inLoading} {...gridProps} />
              </Box>
              {/* 합계줄. 수량은 품목마다 단위가 달라 더하지 않는다 */}
              <Box aria-label="입고현황 합계" sx={{
                display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'flex-end', mt: 1, px: 1.5, py: 1,
                borderRadius: 1, bgcolor: 'action.hover', fontSize: 14, fontWeight: 700,
              }}>
                <span style={{ marginRight: 'auto' }}>합계 ({inRows?.length ?? 0}건)</span>
                <span>공급가액 {formatMoney(sumOf(inRows ?? [], 'supplyAmount'))}</span>
                <span>부가세 {formatMoney(sumOf(inRows ?? [], 'vatAmount'))}</span>
                <span>합계금액 {formatMoney(sumOf(inRows ?? [], 'totalAmount'))}</span>
              </Box>
            </Card>
          </Box>
        </>
      )}

      {tab === 'doc' && (
        <>
          <PageSearchArea
            searchField={textField(docQuery.materialQ, changeDoc('materialQ'), '원재료명 검색', true)}
            onDefaultSearch={() => void loadDoc()}
          >
            {textField(docQuery.clientQ, changeDoc('clientQ'), '거래처명 검색')}
            {periodFields(docQuery.start, docQuery.end, (start) => setDocQuery((c) => ({ ...c, start })), (end) => setDocQuery((c) => ({ ...c, end })))}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>품목별 서류</Typography>
                {docSummary && !docLoading && docRows.length === 0 && (
                  <Typography variant="body2" color="text.secondary">{missingOnly ? '서류가 빠진 품목이 없습니다' : '이 조건에 맞는 입고내역이 없습니다'}</Typography>
                )}
                <FormControlLabel
                  sx={{ ml: 'auto', mr: 0 }}
                  control={<Checkbox size="small" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} />}
                  label={<Typography variant="body2">서류 없는 품목만 보기</Typography>}
                />
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <F1Grid rows={docRows} columns={docColumns} rowKey="key" storageKey="pu-recv-doc-grid" ariaLabel="F1-GRID 서류등록"
                  loading={docLoading} {...gridProps} />
              </Box>
            </Card>
          </Box>
        </>
      )}

      {tab === 'return' && (
        <>
          <PageSearchArea
            searchField={textField(retClient, (event) => setRetClient(event.target.value), '거래처 검색', true)}
            onDefaultSearch={() => guard('return', () => void loadReturns(retDate, retClient))}
          >
            {dateField(retDate, setRetDate, '반품일')}
          </PageSearchArea>
          <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Card sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>반품내역</Typography>
                {returns && !retLoading && returns.length === 0 && <Typography variant="body2" color="text.secondary">반품내역이 없습니다</Typography>}
                <Typography sx={{ ml: 'auto', fontSize: 14 }} aria-label="반품 합계금액">
                  반품 합계금액 <Box component="b" sx={red}>{formatMoney(sumOf(returns ?? [], 'totalAmount'))}</Box>원
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <F1Grid key={retVersion} ref={returnGridRef} rows={returns ?? []} columns={returnColumns} rowKey="id" storageKey="pu-recv-return-grid" ariaLabel="F1-GRID 반품내역"
                  loading={retLoading} {...gridProps}
                  allowDeleteRowInContextMenu={canDelete} selectRowOnContextMenu onChangesChange={() => refreshDirty('return')} />
              </Box>
            </Card>
          </Box>
        </>
      )}

      <ReceivingDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(receiveDate) => {
          // 등록한 입고일의 내역을 바로 보여준다
          setHistoryDate(receiveDate);
          void loadHistory(receiveDate, historyClient);
        }}
      />
      <ReturnDialog
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        onRegistered={(returnDate) => {
          setRetDate(returnDate);
          void loadReturns(returnDate, retClient);
          void loadHistory(historyDate, historyClient);
        }}
      />
      <DocUploadDialog open={uploadTarget != null} materialName={uploadTarget?.name ?? ''} rows={uploadRows}
        onClose={() => setUploadTarget(null)} onChanged={refreshDocFiles} />
      <DocViewDialog open={viewTarget != null} materialName={viewTarget?.name ?? ''} rows={viewRows} onClose={() => setViewTarget(null)} />
      <DocDetailDialog target={detailTarget} start={detailQuery.start} end={detailQuery.end} clientQ={detailQuery.clientQ} onClose={() => setDetailTarget(null)} />
      <ConfirmDialog
        open={confirmDelete != null}
        title={confirmDelete?.kind === 'return' ? '반품 삭제' : '입고 삭제'}
        message={confirmDelete?.kind === 'return'
          ? `반품 ${confirmDelete.count}건을 지우고 저장할까요? 뺐던 재고가 다시 돌아와요.`
          : `입고 ${confirmDelete?.count ?? 0}건을 지우고 저장할까요? 재고에서 그만큼 다시 차감되고, 붙여둔 서류도 같이 지워져요.`}
        confirmLabel="삭제하고 저장"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const target = confirmDelete;
          setConfirmDelete(null);
          if (target) void saveAll(target.kind);
        }}
      />
      <UnsavedChangesConfirmDialog
        open={Boolean(confirmLeave)}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 계속하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setConfirmLeave(null)}
        onContinue={() => {
          const action = confirmLeave;
          setConfirmLeave(null);
          action?.();
        }}
      />
      <ConfirmDialog open={alertText != null} title="입고관리" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}
