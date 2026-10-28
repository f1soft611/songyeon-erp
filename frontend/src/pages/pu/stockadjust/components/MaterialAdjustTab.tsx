import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import { F1Grid, F1Tree, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../shared/utils/excelFile';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { cancelAllSchedule, cancelSchedule, confirmSchedule, fetchMaterialHistory, fetchSchedule } from '../services/stockAdjust.service';
import {
  CANCEL_ALL_QUESTION, DATE_REQUIRED, MATERIAL_HISTORY_EXCEL_COLUMNS, NOTE_REQUIRED, confirmQuestion, confirmedMessage, diffColor, diffText,
  finalQty, formatQty, historyTree, warehouseTotals, type HistoryNode, type StockSchedule,
} from '../utils/stockAdjust';
import { ScheduleEditDialog } from './StockAdjustDialogs';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 34, minRowHeight: 34, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };
const rowButton = { minWidth: 0, px: 1, py: 0 };
const INFO = '#2563eb';

type Ask = { text: string; action: () => void } | null;

// 원재료 재고조정 탭 (송연 #stock-tab-material · 18-stock.js 1-272 · 531-598)
// 재고조사한 수량을 엑셀로 올리면 '예정된 재고조정' 에 쌓이고, 반영일과 사유를 적어 확정해야 실제 재고에 반영된다.
export function MaterialAdjustTab({ refreshKey, warehouses }: { refreshKey: number; warehouses: string[] }) {
  const [schedule, setSchedule] = useState<StockSchedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmDate, setConfirmDate] = useState(() => todayDash());
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<StockSchedule | null>(null);
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [history, setHistory] = useState<StockSchedule[] | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);

  const loadSchedule = useCallback(async () => {
    try {
      setSchedule(await fetchSchedule('materials'));
      setLoaded(true);
    } catch (requestError) {
      setAlertText(errorText(requestError, '예정된 재고조정을 불러오지 못했어요'));
    }
  }, []);

  const loadHistory = useCallback(async (start: string, end: string) => {
    try {
      setHistory(await fetchMaterialHistory(start, end));
      setTreeVersion((v) => v + 1);
    } catch (requestError) {
      setAlertText(errorText(requestError, '재고조정 내역을 불러오지 못했어요'));
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule, refreshKey]);
  useEffect(() => {
    void loadHistory('', '');
  }, [loadHistory]);

  // 사유 없이 재고를 바꾸면 나중에 왜 바뀌었는지 되짚을 수 없다
  const confirm = () => {
    if (!confirmDate) {
      setAlertText(DATE_REQUIRED);
      return;
    }
    if (!note.trim()) {
      setAlertText(NOTE_REQUIRED);
      return;
    }
    setAsk({
      text: confirmQuestion(confirmDate, note.trim()),
      action: async () => {
        try {
          const result = await confirmSchedule('materials', confirmDate, note.trim());
          setAlertText(confirmedMessage(result));
          setNote('');
          void loadSchedule();
          void loadHistory(historyStart, historyEnd);
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
        const n = await cancelAllSchedule('materials');
        setAlertText(`${n}건 취소완료`);
        void loadSchedule();
      } catch (requestError) {
        setAlertText(errorText(requestError, '취소에 실패했어요'));
      }
    },
  });

  const cancelOne = async (row: StockSchedule) => {
    try {
      await cancelSchedule('materials', row.id);
      void loadSchedule();
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소에 실패했어요'));
    }
  };

  const exportHistory = async () => {
    try {
      await downloadExcel(await fetchMaterialHistory(historyStart, historyEnd), MATERIAL_HISTORY_EXCEL_COLUMNS, '재고조정내역.xlsx', '재고조정내역');
    } catch (requestError) {
      setAlertText(errorText(requestError, '다운로드하지 못했어요'));
    }
  };

  const totals = useMemo(() => warehouseTotals(schedule, warehouses), [schedule, warehouses]);

  const scheduleColumns = useMemo<F1GridColumn<StockSchedule>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '원재료', flex: 1.4, width: 220, headerAlign: 'center', align: 'left', renderCell: ({ row }) => `${row.name || ''} (${row.code})` },
    {
      field: 'warehouse', headerName: '창고', width: 110, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => row.warehouse || <Typography component="span" variant="body2" color="text.secondary">미지정</Typography>,
    },
    { field: 'currentStockQty', headerName: '이전(전산)', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatQty(row.currentStockQty), getCellStyle: () => ({ color: '#64748b' }) },
    {
      field: 'targetQty', headerName: '이후(실사)', width: 140, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => `${formatQty(finalQty(row))}${row.editedQty != null ? ' (수정됨)' : ''}`,
      getCellStyle: ({ row }) => ({ fontWeight: 700, ...(row.editedQty != null ? { color: INFO } : {}) }),
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

  const historyRows = useMemo(() => historyTree(history ?? []), [history]);
  const historyColumns = useMemo<F1GridColumn<HistoryNode>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'label', headerName: '반영일 / 원재료', flex: 1.4, width: 260, headerAlign: 'center', align: 'left',
      getCellStyle: ({ row }) => (row.kind === 'group' ? { fontWeight: 700 } : undefined),
    },
    { field: 'count', headerName: '변경 건수', width: 90, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.kind === 'group' ? `${row.count}건` : '') },
    {
      field: 'notes', headerName: '사유', flex: 1, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.kind !== 'group' ? '' : row.notes || <Typography component="span" variant="body2" color="text.secondary">사유 없음(예전 자료)</Typography>),
    },
    { field: 'oldQty', headerName: '이전', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.kind === 'item' ? formatQty(row.oldQty) : '') },
    { field: 'newQty', headerName: '이후', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.kind === 'item' ? formatQty(row.newQty) : '') },
    {
      field: 'diff', headerName: '차이', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => (row.kind === 'item' ? diffText(row.diff) : ''),
      getCellStyle: ({ row }) => ({ fontWeight: 700, color: diffColor(row.diff) }),
    },
  ], []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          재고조사한 수량을 엑셀로 올리면 아래 <b>예정된 재고조정</b>에 쌓입니다. 반영일과 사유를 적고 확정을 눌러야 실제 재고에 반영돼요.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>예정된 재고조정</Typography>
          <TextField type="date" size="small" margin="none" value={confirmDate} onChange={(event) => setConfirmDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료 반영일' } }} sx={{ width: 170 }} />
          {/* 사유는 이 묶음 전체에 같이 남는다 — 나중에 '왜 늘었지' 를 되짚으려면 꼭 필요하다 */}
          <TextField size="small" margin="none" placeholder="조정 사유 (예: 9월 정기 재고조사)" value={note} onChange={(event) => setNote(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '조정 사유' } }} sx={{ width: 260 }} />
          <Button variant="contained" onClick={confirm}>이 날짜로 전체 확정</Button>
          <Button variant="outlined" color="error" onClick={cancelAll}>전체 취소</Button>
        </Box>
        {loaded && schedule.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>예정된 재고조정이 없습니다</Typography>}
        <Box sx={{ height: 280 }}>
          <F1Grid rows={schedule} columns={scheduleColumns} rowKey="id" storageKey="pu-stockadjust-material-schedule-grid" ariaLabel="F1-GRID 예정된 원재료 재고조정" {...gridProps} />
        </Box>
        {totals.length > 0 && (
          <Box aria-label="창고별 합계" sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) repeat(4, auto)', columnGap: 3, rowGap: 0.25, fontSize: 13, px: 1.5, py: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
            {totals.map((t) => (
              <Box key={t.label} sx={{ display: 'contents', '& > span': t.all ? { pt: 0.5, borderTop: 1, borderColor: 'divider' } : {} }}>
                <Box component="span" sx={{ fontWeight: 700 }}>{t.label}</Box>
                <Box component="span" sx={{ color: 'text.secondary' }}>{t.count}건</Box>
                <Box component="span" sx={{ color: 'text.secondary', textAlign: 'right' }}>전산 {formatQty(t.current)}</Box>
                <Box component="span" sx={{ fontWeight: 700, textAlign: 'right' }}>실사 {formatQty(t.target)}</Box>
                <Box component="span" sx={{ fontWeight: 700, textAlign: 'right', color: diffColor(t.diff) }}>{t.diff > 0 ? '+' : ''}{formatQty(t.diff)}</Box>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>적용된 재고조정 내역</Typography>
          <TextField type="date" size="small" margin="none" value={historyStart} onChange={(event) => setHistoryStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '내역 시작일' } }} sx={{ width: 170 }} />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField type="date" size="small" margin="none" value={historyEnd} onChange={(event) => setHistoryEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '내역 종료일' } }} sx={{ width: 170 }} />
          <Button variant="contained" onClick={() => void loadHistory(historyStart, historyEnd)}>조회</Button>
          <Button variant="outlined" onClick={() => void exportHistory()}>엑셀 다운로드</Button>
        </Box>
        {history && history.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>적용된 재고조정 내역이 없습니다</Typography>}
        <Box sx={{ height: 280 }}>
          <F1Tree key={treeVersion} rows={historyRows} columns={historyColumns} rowKey="id" parentKey="parentId" treeColumn="label"
            storageKey="pu-stockadjust-material-history-tree" ariaLabel="F1-TREE 적용된 원재료 재고조정" {...gridProps} />
        </Box>
      </Card>

      <ScheduleEditDialog target="materials" row={editing} onClose={() => setEditing(null)} onSaved={() => void loadSchedule()} />
      <ConfirmDialog open={ask != null} title="원재료 재고조정" message={ask?.text ?? ''} confirmLabel="확인"
        onCancel={() => setAsk(null)} onConfirm={() => { const action = ask?.action; setAsk(null); action?.(); }} />
      <ConfirmDialog open={alertText != null} title="원재료 재고조정" message={alertText ?? ''} alertOnly
        onCancel={() => setAlertText(null)} onConfirm={() => setAlertText(null)} />
    </Box>
  );
}
