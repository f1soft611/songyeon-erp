import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaidIcon from '@mui/icons-material/Paid';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { CharterDialog } from './components/CharterDialog';
import {
  PACKING_CODE_GROUP, VEHICLE_CODE_GROUP, confirmShipment, fetchCommonCodeNames, fetchDriverNames, fetchShipSchedule, unconfirmShipment,
} from './services/shipConfirm.service';
import {
  buildShipmentLogHtml, buildWorkOrderHtml, isConfirmed, hasShipQty, negativeStockMessage, onlyDecimal, onlyDigits, onlyQty,
  SHIP_EXCEL_COLUMNS, sortByVehicle, toConfirmBody, toShipRow, type ShipRow,
} from './utils/shipConfirm';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const rowButton = { minWidth: 0, px: 1, py: 0 };
const toOptions = (names: string[]) => [{ value: '', label: '선택' }, ...names.map((name) => ({ value: name, label: name }))];

type ShipConfirmPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

// 확정 전 줄은 빨간 바탕에 왼쪽 선(생산확정과 같음)
const cellStyle = (row: ShipRow, first = false): CSSProperties =>
  (isConfirmed(row) ? {} : { background: 'rgba(220, 38, 38, 0.08)', ...(first ? { boxShadow: 'inset 4px 0 0 #dc2626' } : {}) });

// 칸마다 넣을 수 있는 글자(순서·박스는 숫자, 용차금액은 숫자와 점, 실출하량은 숫자·점·kg)는 보여줄 때와 보낼 때 거른다.
// 물류관리 > 출하확정 (송연 LG0002, 기존 #screen-ship-confirm · 21-logistics.js loadShipConfirmList)
// 출하등록된 건에 실출하량·배차·포장방법을 적어 확정한다. 확정하면 실출하량만큼 제품 재고가 빠지고(박스도),
// 생산입고를 건너뛴 로트는 나간 만큼 입고로 먼저 잡힌다. 열면 오늘 것을 바로 불러온다.
export function ShipConfirmPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ShipConfirmPageProps) {
  const gridRef = useRef<F1GridRef<ShipRow>>(null);
  const requestIdRef = useRef(0);
  const [date, setDate] = useState(() => todayDash());
  const [loadedDate, setLoadedDate] = useState('');
  const [rows, setRows] = useState<ShipRow[]>([]); // 조회한 그대로(인쇄는 이 순서)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [version, setVersion] = useState(0);
  const [sorted, setSorted] = useState(false); // 🚚 배차·순서로 정렬해서 보는 중
  const [loading, setLoading] = useState(false);
  const [packingNames, setPackingNames] = useState<string[]>([]);
  const [vehicleNames, setVehicleNames] = useState<string[]>([]);
  const [driverNames, setDriverNames] = useState<string[]>([]);
  const [pending, setPending] = useState<{ row: ShipRow; message: string } | null>(null); // 재고 마이너스 확인
  const [undoing, setUndoing] = useState<ShipRow | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [charterOpen, setCharterOpen] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [error, setError] = useState('');

  // 표 안에서 친 값을 목록으로 되받아 온다
  const pull = (): ShipRow[] => gridRef.current?.getActiveRows() ?? rowsRef.current;

  const loadRows = useCallback(async (day: string) => {
    if (!day) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const records = await fetchShipSchedule(day);
      if (requestId !== requestIdRef.current) return;
      const next = records.map(toShipRow);
      rowsRef.current = next;
      setRows(next);
      setSorted(false);
      setLoadedDate(day);
      setVersion((v) => v + 1);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(errorText(requestError, '출하 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows(todayDash());
    // 칸에 고를 것. 못 받으면 빈 목록(고를 것 없이 비워둔다)
    fetchCommonCodeNames(PACKING_CODE_GROUP).then(setPackingNames).catch(() => undefined);
    fetchCommonCodeNames(VEHICLE_CODE_GROUP).then(setVehicleNames).catch(() => undefined);
    fetchDriverNames().then(setDriverNames).catch(() => undefined);
  }, [loadRows]);

  const send = async (row: ShipRow) => {
    try {
      await confirmShipment(row.source, row.id, toConfirmBody(row, packingNames, vehicleNames));
    } catch (requestError) {
      setAlertText(errorText(requestError, '실출하량 저장에 실패했어요'));
      return;
    }
    await loadRows(loadedDate || date);
  };

  const confirmRow = async (key: string) => {
    const row = pull().find((item) => item.key === key);
    if (!row) return;
    const actualQty = onlyQty(row.inputActual).trim();
    // 2026-10-26 숫자 칸은 비우거나 글자만 치면 0 이 된다. 0 으로 확정하지 않게 막는다
    if (!actualQty || !hasShipQty(actualQty)) {
      setAlertText('실출하량을 입력해주세요. 이 수량만큼 재고가 빠져요.');
      return;
    }
    // 확정하면 재고가 마이너스로 가는 때만 물어본다
    const warning = negativeStockMessage(row, actualQty);
    if (warning) {
      setPending({ row, message: warning });
      return;
    }
    await send(row);
  };

  const unconfirm = async () => {
    const row = undoing;
    setUndoing(null);
    if (!row) return;
    try {
      await unconfirmShipment(row.source, row.id);
    } catch (requestError) {
      setAlertText(errorText(requestError, '확정취소에 실패했어요'));
      return;
    }
    await loadRows(loadedDate || date);
  };

  const sortRows = () => {
    if (rows.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    const current = pull();
    rowsRef.current = current;
    setRows(current);
    setSorted(true);
    setVersion((v) => v + 1);
  };

  const openPrint = () => {
    if (rows.length === 0) {
      setAlertText('먼저 조회해주세요');
      return;
    }
    setPrintOpen(true);
  };

  const print = (kind: 'log' | 'work') => {
    setPrintOpen(false);
    const win = window.open('', '_blank');
    if (!win) {
      setAlertText('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
      return;
    }
    // 조회한 순서 그대로, 조회한 날짜로 찍는다
    win.document.write(kind === 'log' ? buildShipmentLogHtml(rows, loadedDate) : buildWorkOrderHtml(rows, loadedDate));
    win.document.close();
  };

  // 송연 엑셀: 그 날짜 출하 목록을 서버에서 다시 받는다
  const exportExcel = async () => {
    if (!date) {
      setError('조회할 날짜를 먼저 선택해주세요');
      return;
    }
    try {
      const list = (await fetchShipSchedule(date)).map(toShipRow);
      if (list.length === 0) {
        setAlertText('다운로드할 데이터가 없어요');
        return;
      }
      await downloadExcel(list, SHIP_EXCEL_COLUMNS, `출하확정_${date}.xlsx`, '출하확정');
    } catch (requestError) {
      setError(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const shown = useMemo(() => (sorted ? sortByVehicle(rows) : rows), [rows, sorted]);

  const columns = useMemo<F1GridColumn<ShipRow>[]>(() => {
    const style = (first = false) => ({ getCellStyle: ({ row }: { row: ShipRow }) => cellStyle(row, first) });
    const editable = (row: ShipRow) => !isConfirmed(row);
    return [
      { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left', ...style(true) },
      { field: 'vehicleGroup', headerName: '🚚 배차', width: 110, headerAlign: 'center', align: 'center', pinned: 'left', mergeRows: true, hidden: !sorted },
      { field: 'clientName', headerName: '거래처', width: 140, headerAlign: 'center', align: 'left', ...style() },
      { field: 'productName', headerName: '품목명(규격)', width: 200, headerAlign: 'center', align: 'left', ...style() },
      { field: 'storage', headerName: '보관방법', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.storage || '', ...style() },
      {
        field: 'plannedQty', headerName: '출하예정', width: 90, headerAlign: 'center', align: 'right',
        type: 'number', decimalPlaces: 2, renderCell: ({ row }) => row.plannedQty || '', ...style()
      },
      {
        // 2026-10-26 숫자 칸(글자는 들어가지 않는다, 소수 둘째 자리까지)
        field: 'inputActual', headerName: '실출하량', width: 100, headerAlign: 'center', align: 'right', editable,
        type: 'number', decimalPlaces: 2,
        renderCell: ({ row }) => (onlyQty(row.inputActual) ? onlyQty(row.inputActual)
          : <Typography component="span" variant="body2" color="text.disabled">실제 나간 양</Typography>),
        getCellStyle: ({ row }) => (isConfirmed(row) ? { fontWeight: 700 } : { ...cellStyle(row), background: 'rgba(37, 99, 235, 0.08)', fontWeight: 700 }),
      },
      { field: 'lotText', headerName: '로트번호', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.lotText || '', ...style() },
      {
        // 2026-10-26 숫자 칸(글자는 들어가지 않는다). 입력한 그대로 보이고 저장한다
        field: 'inputBox', headerName: '박스수량', width: 80, headerAlign: 'center', align: 'right', editable,
        type: 'number',
        renderCell: ({ row }) => onlyDecimal(row.inputBox), ...style(),
      },
      { field: 'inputPacking', headerName: '포장방법', width: 110, headerAlign: 'center', align: 'left', type: 'select', options: toOptions(packingNames), editable, ...style() },
      { field: 'inputDriver', headerName: '운행자', width: 100, headerAlign: 'center', align: 'left', type: 'autocomplete', options: toOptions(driverNames).slice(1), editable, ...style() },
      { field: 'inputVehicle', headerName: '배차', width: 100, headerAlign: 'center', align: 'left', type: 'select', options: toOptions(vehicleNames), editable, ...style() },
      {
        field: 'inputOrder', headerName: '순서', width: 60, headerAlign: 'center', align: 'right', editable,
        renderCell: ({ row }) => onlyDigits(row.inputOrder), ...style(),
      },
      { field: 'inputCharterInfo', headerName: '용차정보', width: 110, headerAlign: 'center', align: 'left', editable, ...style() },
      {
        // 2026-10-26 숫자 칸(글자는 들어가지 않는다). 입력한 그대로 보이고 저장한다
        field: 'inputCharterAmount', headerName: '용차금액', width: 100, headerAlign: 'center', align: 'right', editable,
        type: 'number',
        renderCell: ({ row }) => onlyDecimal(row.inputCharterAmount), ...style(),
      },
      { field: 'inputNote', headerName: '특이사항', width: 150, headerAlign: 'center', align: 'left', editable, ...style() },
      {
        field: 'source', headerName: '', width: 100, headerAlign: 'center', align: 'center', pinned: 'right', ...style(),
        renderCell: ({ row }) => (isConfirmed(row) ? (
          <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => setUndoing(row)}>확정취소</Button>
        ) : (
          <Button size="small" variant="contained" sx={rowButton} onClick={() => void confirmRow(row.key)}>확정</Button>
        )),
      },
    ];
    // 단추는 누를 때 표의 값을 다시 읽으므로, 표를 새로 그릴 때(version) 함께 새로 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, sorted, packingNames, vehicleNames, driverNames]);

  const confirmedCount = rows.filter(isConfirmed).length;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void loadRows(date) },
        { label: '배차·순서로 정렬', icon: LocalShippingIcon, visible: Boolean(selectedMenuPermissions?.read), onClick: sortRows },
        { label: '용차 금액 확인', icon: PaidIcon, visible: Boolean(selectedMenuPermissions?.read), onClick: () => setCharterOpen(true) },
        { label: '인쇄', icon: PrintIcon, visible: Boolean(selectedMenuPermissions?.read), onClick: openPrint },
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            type="date"
            size="small"
            margin="none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '출고일' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void loadRows(date)}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            {!loading && rows.length === 0 && (
              <Typography variant="body2" color="text.secondary">이 날짜에 출하등록된 건이 없습니다</Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              실출하량을 적고 [확정] 하면 그만큼 제품 재고가 빠져요(박스수량이 있으면 박스도). 생산입고 전 로트는 나간 만큼 먼저 입고로 잡혀요.
            </Typography>
            {rows.length > 0 && (
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700 }}>
                확정 {confirmedCount} / {rows.length}건
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              key={version}
              ref={gridRef}
              rows={shown}
              columns={columns}
              rowKey="key"
              storageKey="lg-ship-confirm-grid"
              ariaLabel="F1-GRID 출하확정"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              columnLine
              showCheckbox={false}
              loading={loading}
              resizableRows={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>
      </Box>
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xs" fullWidth aria-labelledby="ship-print-title">
        <DialogTitle id="ship-print-title">인쇄할 문서를 선택해주세요</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>현재 조회된 날짜의 출하확정 목록을 기준으로 인쇄해요.</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant="contained" onClick={() => print('log')}>📦 완제품출고일지</Button>
            <Button fullWidth variant="contained" onClick={() => print('work')}>📋 작업지시서</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
      <CharterDialog open={charterOpen} onClose={() => setCharterOpen(false)} onAlert={setAlertText} />
      <ConfirmDialog
        open={alertText != null}
        title="출하확정"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title="재고 확인"
        message={pending?.message ?? ''}
        confirmLabel="확정"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const row = pending?.row;
          setPending(null);
          if (row) void send(row);
        }}
      />
      <ConfirmDialog
        open={Boolean(undoing)}
        title="확정취소"
        message="확정을 취소할까요? 다시 수정할 수 있는 상태로 돌아가요."
        confirmLabel="확정취소"
        danger
        onCancel={() => setUndoing(null)}
        onConfirm={() => void unconfirm()}
      />
    </Box>
  );
}
