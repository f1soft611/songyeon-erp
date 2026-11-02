import { useMemo } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import { ConfirmDialog } from '../../../../../shared/components/ConfirmDialog';
import { useMaterialAdjust } from '../hooks/useMaterialAdjust';
import { diffColor, formatQty } from '../utils/stockAdjust';
import { MaterialHistoryTree, createMaterialHistoryColumns } from './MaterialHistoryTree';
import { MaterialScheduleGrid, createMaterialScheduleColumns } from './MaterialScheduleGrid';
import { ScheduleEditDialog } from './StockAdjustDialogs';

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };

// 원재료 재고조정 탭 (송연 #stock-tab-material · 18-stock.js 1-272 · 531-598)
// 재고조사한 수량을 엑셀로 올리면 '예정된 재고조정' 에 쌓이고, 반영일과 사유를 적어 확정해야 실제 재고에 반영된다.
export function MaterialAdjustTab({ refreshKey, warehouses }: { refreshKey: number; warehouses: string[] }) {
  const management = useMaterialAdjust(refreshKey, warehouses);
  const { setEditing, cancelOne, schedule, totals, history, historyStart, historyEnd, ask } = management;
  const scheduleColumns = useMemo(
    () => createMaterialScheduleColumns({ onEdit: setEditing, onCancel: (row) => void cancelOne(row) }),
    [setEditing, cancelOne],
  );
  const historyColumns = useMemo(() => createMaterialHistoryColumns(), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          재고조사한 수량을 엑셀로 올리면 아래 <b>예정된 재고조정</b>에 쌓입니다. 반영일과 사유를 적고 확정을 눌러야 실제 재고에 반영돼요.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>예정된 재고조정</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.confirmDate}
            onChange={(event) => management.setConfirmDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료 반영일' } }}
            sx={{ width: 170 }}
          />
          {/* 사유는 이 묶음 전체에 같이 남는다 — 나중에 '왜 늘었지' 를 되짚으려면 꼭 필요하다 */}
          <TextField
            size="small"
            margin="none"
            placeholder="조정 사유 (예: 9월 정기 재고조사)"
            value={management.note}
            onChange={(event) => management.setNote(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '조정 사유' } }}
            sx={{ width: 260 }}
          />
          <Button variant="contained" onClick={management.confirm}>이 날짜로 전체 확정</Button>
          <Button variant="outlined" color="error" onClick={management.cancelAll}>전체 취소</Button>
        </Box>
        {management.loaded && schedule.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>예정된 재고조정이 없습니다</Typography>}
        <MaterialScheduleGrid rows={schedule} columns={scheduleColumns} />
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
          <TextField
            type="date"
            size="small"
            margin="none"
            value={historyStart}
            onChange={(event) => management.setHistoryStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '내역 시작일' } }}
            sx={{ width: 170 }}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={historyEnd}
            onChange={(event) => management.setHistoryEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '내역 종료일' } }}
            sx={{ width: 170 }}
          />
          <Button variant="contained" onClick={() => void management.loadHistory(historyStart, historyEnd)}>조회</Button>
          <Button variant="outlined" onClick={() => void management.exportHistory()}>엑셀 다운로드</Button>
        </Box>
        {history && history.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>적용된 재고조정 내역이 없습니다</Typography>}
        <MaterialHistoryTree rows={management.historyRows} columns={historyColumns} treeVersion={management.treeVersion} />
      </Card>

      <ScheduleEditDialog target="materials" row={management.editing} onClose={() => setEditing(null)} onSaved={() => void management.loadSchedule()} />
      <ConfirmDialog
        open={ask != null}
        title="원재료 재고조정"
        message={ask?.text ?? ''}
        confirmLabel="확인"
        onCancel={() => management.setAsk(null)}
        onConfirm={management.runAsk}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="원재료 재고조정"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}
