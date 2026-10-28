import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { downloadExcel, readExcelValues, todayDash } from '../../../../shared/utils/excelFile';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { cancelAllSchedule, cancelSchedule, confirmSchedule, fetchProductHistory, fetchSchedule, uploadStock } from '../services/stockAdjust.service';
import {
  CANCEL_ALL_QUESTION, DATE_REQUIRED, PRODUCT_HISTORY_EXCEL_COLUMNS, PRODUCT_KINDS, confirmQuestion, confirmedMessage, diffColor, diffText,
  filterByProduct, finalQty, formatMoney, formatQty, kindColor, productUploadMessage, toUploadRows, type ProductMovement, type StockSchedule,
} from '../utils/stockAdjust';
import { ExcelDropZone } from './ExcelDropZone';
import { ScheduleEditDialog } from './StockAdjustDialogs';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };
const rowButton = { minWidth: 0, px: 1, py: 0 };

type Ask = { text: string; action: () => void } | null;
type HistoryRow = ProductMovement & { key: number };

// 제품 재고조정 탭 (송연 #stock-tab-product · 18-stock.js 274-432)
// 제품 입출고 내역은 재고를 움직인 모든 일(생산입고·출하·재고조정 …)이 한 줄씩 남는 원장이다 — 어긋난 지점을 찾을 수 있게.
export function ProductAdjustTab() {
  const [schedule, setSchedule] = useState<StockSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; ok: boolean | null } | null>(null);
  const [confirmDate, setConfirmDate] = useState(() => todayDash());
  const [editing, setEditing] = useState<StockSchedule | null>(null);
  const [historyQuery, setHistoryQuery] = useState({ start: '', end: '', kind: '', product: '' });
  const [history, setHistory] = useState<ProductMovement[] | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setSchedule(await fetchSchedule('products'));
      setLoaded(true);
    } catch (requestError) {
      setAlertText(errorText(requestError, '예정된 재고조정을 불러오지 못했어요'));
    }
  }, []);

  const fetchHistory = useCallback(async (query: typeof historyQuery) =>
    filterByProduct(await fetchProductHistory(query.start, query.end, query.kind), query.product), []);

  const loadHistory = useCallback(async (query: typeof historyQuery) => {
    try {
      setHistory(await fetchHistory(query));
    } catch (requestError) {
      setAlertText(errorText(requestError, '입출고 내역을 불러오지 못했어요'));
    }
  }, [fetchHistory]);

  useEffect(() => {
    void loadSchedule();
    void loadHistory({ start: '', end: '', kind: '', product: '' });
  }, [loadSchedule, loadHistory]);

  const upload = async (file: File) => {
    setUploadMessage({ text: '올리는 중...', ok: null });
    try {
      let rows: string[][];
      try {
        rows = toUploadRows(await readExcelValues(file));
      } catch {
        throw new Error('엑셀 파일을 읽을 수 없습니다');
      }
      setUploadMessage({ text: productUploadMessage(await uploadStock('products', rows)), ok: true });
      void loadSchedule();
    } catch (requestError) {
      setUploadMessage({ text: errorText(requestError, '업로드에 실패했어요'), ok: false });
    }
  };

  const confirm = () => {
    if (!confirmDate) {
      setAlertText(DATE_REQUIRED);
      return;
    }
    setAsk({
      text: confirmQuestion(confirmDate),
      action: async () => {
        try {
          setAlertText(confirmedMessage(await confirmSchedule('products', confirmDate)));
          void loadSchedule();
          void loadHistory(historyQuery);
        } catch (requestError) {
          setAlertText(errorText(requestError, '확정에 실패했어요'));
        }
      },
    });
  };

  const cancelAll = () => setAsk({
    text: CANCEL_ALL_QUESTION,
    action: async () => {
      try {
        setAlertText(`${await cancelAllSchedule('products')}건 취소완료`);
        void loadSchedule();
      } catch (requestError) {
        setAlertText(errorText(requestError, '취소에 실패했어요'));
      }
    },
  });

  const cancelOne = async (row: StockSchedule) => {
    try {
      await cancelSchedule('products', row.id);
      void loadSchedule();
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소에 실패했어요'));
    }
  };

  const exportHistory = async () => {
    try {
      await downloadExcel(await fetchHistory(historyQuery), PRODUCT_HISTORY_EXCEL_COLUMNS, '제품입출고내역.xlsx', '제품입출고내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const scheduleColumns = useMemo<F1GridColumn<StockSchedule>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '제품', flex: 1.4, width: 240, headerAlign: 'center', align: 'left', renderCell: ({ row }) => `${row.name || ''} (${row.code})` },
    { field: 'currentStockQty', headerName: '이전', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.currentStockQty), getCellStyle: () => ({ color: '#64748b' }) },
    {
      field: 'targetQty', headerName: '이후', width: 140, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => `${formatQty(finalQty(row))}${row.editedQty != null ? ' (수정됨)' : ''}`,
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.editedQty != null ? { color: '#2563eb' } : {}) }),
    },
    {
      field: 'diff', headerName: '차이', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => diffText(row.diff),
      getCellStyle: ({ row }) => ({ fontWeight: 700, color: diffColor(row.diff) }),
    },
    {
      field: 'newStockQty', headerName: '', width: 120, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={rowButton} onClick={() => setEditing(row)}>수정</Button>
          <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => void cancelOne(row)}>취소</Button>
        </Box>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const historyRows = useMemo<HistoryRow[]>(() => (history ?? []).map((row, i) => ({ ...row, key: i + 1 })), [history]);
  const historyColumns = useMemo<F1GridColumn<HistoryRow>[]>(() => [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'movedOn', headerName: '날짜', width: 110, headerAlign: 'center', align: 'center' },
    { field: 'productName', headerName: '품목명', flex: 1.4, width: 220, headerAlign: 'center', align: 'left' },
    {
      field: 'kind', headerName: '종류', width: 96, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={kindColor(row.kind)} label={row.kind || ''} />,
    },
    {
      field: 'qty', headerName: '수량', width: 100, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => `${(row.qty || 0) > 0 ? '+' : ''}${formatQty(row.qty)}`,
      getCellStyle: ({ row }) => ({ color: (row.qty || 0) > 0 ? '#2563eb' : '#dc2626' }),
    },
    { field: 'balanceAfter', headerName: '이후 재고', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatMoney(row.balanceAfter) },
    { field: 'clientName', headerName: '거래처', width: 150, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    {
      field: 'note', headerName: '비고', flex: 1, width: 180, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => <Typography component="span" variant="body2" color="text.secondary">{row.note || ''}{row.createdByName ? ` (${row.createdByName})` : ''}</Typography>,
    },
  ], []);

  const changeQuery = (key: keyof typeof historyQuery) => (event: { target: { value: string } }) =>
    setHistoryQuery((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>재고조정 — 엑셀 업로드</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ① 제품 리스트 엑셀(&quot;전체 재고 조회&quot;나 제품재고관리 화면에서 다운로드)에 &quot;재고수량&quot; 칸을 채워서 업로드해주세요.<br />
          ② 업로드하면 바로 반영되지 않고 아래 &quot;예정된 재고조정&quot; 목록에 대기 상태로 쌓여요.<br />
          ③ 반영일을 지정하고 확정 버튼을 누르면 그때 실제 재고에 반영돼요.
        </Typography>
        <ExcelDropZone label="제품 재고 엑셀" onFile={(file) => void upload(file)} />
        {uploadMessage && <Alert severity={uploadMessage.ok == null ? 'info' : uploadMessage.ok ? 'success' : 'error'} sx={{ mt: 1 }}>{uploadMessage.text}</Alert>}
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>예정된 재고조정</Typography>
          <TextField type="date" size="small" margin="none" value={confirmDate} onChange={(event) => setConfirmDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품 반영일' } }} sx={{ width: 170 }} />
          <Button variant="contained" onClick={confirm}>이 날짜로 전체 확정</Button>
          <Button variant="outlined" color="error" onClick={cancelAll}>전체 취소</Button>
        </Box>
        {loaded && schedule.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>예정된 재고조정이 없습니다</Typography>}
        <Box sx={{ height: 240 }}>
          <F1Grid rows={schedule} columns={scheduleColumns} rowKey="id" storageKey="pu-stockadjust-product-schedule-grid" ariaLabel="F1-GRID 예정된 제품 재고조정" {...gridProps} />
        </Box>
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>제품 입출고 내역</Typography>
          <TextField type="date" size="small" margin="none" value={historyQuery.start} onChange={changeQuery('start')} slotProps={{ htmlInput: { 'aria-label': '입출고 시작일' } }} sx={{ width: 170 }} />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField type="date" size="small" margin="none" value={historyQuery.end} onChange={changeQuery('end')} slotProps={{ htmlInput: { 'aria-label': '입출고 종료일' } }} sx={{ width: 170 }} />
          <TextField select size="small" margin="none" value={historyQuery.kind}
            onChange={(event) => {
              const next = { ...historyQuery, kind: event.target.value };
              setHistoryQuery(next);
              void loadHistory(next); // 송연과 같이 고르면 바로 다시 부른다
            }}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '입출고 종류' } }} sx={{ width: 120 }}>
            <MenuItem value="">전체</MenuItem>
            {PRODUCT_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
          </TextField>
          <TextField size="small" margin="none" placeholder="품목명" value={historyQuery.product} onChange={changeQuery('product')}
            onKeyDown={(event) => { if (event.key === 'Enter') void loadHistory(historyQuery); }}
            slotProps={{ htmlInput: { 'aria-label': '입출고 품목명' } }} sx={{ width: 160 }} />
          <Button variant="contained" onClick={() => void loadHistory(historyQuery)}>조회</Button>
          <Button variant="outlined" onClick={() => void exportHistory()}>엑셀 다운로드</Button>
        </Box>
        {history && history.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>입출고 내역이 없습니다</Typography>}
        <Box sx={{ height: 300 }}>
          <F1Grid rows={historyRows} columns={historyColumns} rowKey="key" storageKey="pu-stockadjust-product-history-grid" ariaLabel="F1-GRID 제품 입출고 내역" {...gridProps} />
        </Box>
      </Card>

      <ScheduleEditDialog target="products" row={editing} onClose={() => setEditing(null)} onSaved={() => void loadSchedule()} />
      <ConfirmDialog open={ask != null} title="제품 재고조정" message={ask?.text ?? ''} confirmLabel="확인"
        onCancel={() => setAsk(null)} onConfirm={() => { const action = ask?.action; setAsk(null); action?.(); }} />
      <ConfirmDialog open={alertText != null} title="제품 재고조정" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}
