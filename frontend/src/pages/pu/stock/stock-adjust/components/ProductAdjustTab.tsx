import { useMemo } from 'react';
import { Alert, Box, Button, Card, MenuItem, TextField, Typography } from '@mui/material';
import { ConfirmDialog } from '../../../../../shared/components/ConfirmDialog';
import { useProductAdjust } from '../hooks/useProductAdjust';
import { PRODUCT_KINDS } from '../utils/stockAdjust';
import { ExcelDropZone } from './ExcelDropZone';
import { ProductHistoryGrid, createProductHistoryColumns } from './ProductHistoryGrid';
import { ProductScheduleGrid, createProductScheduleColumns } from './ProductScheduleGrid';
import { ScheduleEditDialog } from './StockAdjustDialogs';

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', p: 1.5 };

// 제품 재고조정 탭 (송연 #stock-tab-product · 18-stock.js 274-432)
// 제품 입출고 내역은 재고를 움직인 모든 일(생산입고·출하·재고조정 …)이 한 줄씩 남는 원장이다 — 어긋난 지점을 찾을 수 있게.
export function ProductAdjustTab() {
  const management = useProductAdjust();
  const { setEditing, cancelOne, uploadMessage, schedule, history, historyQuery, changeQuery, ask } = management;
  const scheduleColumns = useMemo(
    () => createProductScheduleColumns({ onEdit: setEditing, onCancel: (row) => void cancelOne(row) }),
    [setEditing, cancelOne],
  );
  const historyColumns = useMemo(() => createProductHistoryColumns(), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Card sx={cardSx}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>재고조정 — 엑셀 업로드</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ① 제품 리스트 엑셀(&quot;전체 재고 조회&quot;나 제품재고관리 화면에서 다운로드)에 &quot;재고수량&quot; 칸을 채워서 업로드해주세요.<br />
          ② 업로드하면 바로 반영되지 않고 아래 &quot;예정된 재고조정&quot; 목록에 대기 상태로 쌓여요.<br />
          ③ 반영일을 지정하고 확정 버튼을 누르면 그때 실제 재고에 반영돼요.
        </Typography>
        <ExcelDropZone label="제품 재고 엑셀" onFile={(file) => void management.upload(file)} />
        {uploadMessage && <Alert severity={uploadMessage.ok == null ? 'info' : uploadMessage.ok ? 'success' : 'error'} sx={{ mt: 1 }}>{uploadMessage.text}</Alert>}
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>예정된 재고조정</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.confirmDate}
            onChange={(event) => management.setConfirmDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품 반영일' } }}
            sx={{ width: 170 }}
          />
          <Button variant="contained" onClick={management.confirm}>이 날짜로 전체 확정</Button>
          <Button variant="outlined" color="error" onClick={management.cancelAll}>전체 취소</Button>
        </Box>
        {management.loaded && schedule.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>예정된 재고조정이 없습니다</Typography>}
        <ProductScheduleGrid rows={schedule} columns={scheduleColumns} />
      </Card>

      <Card sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mr: 'auto' }}>제품 입출고 내역</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={historyQuery.start}
            onChange={changeQuery('start')}
            slotProps={{ htmlInput: { 'aria-label': '입출고 시작일' } }}
            sx={{ width: 170 }}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={historyQuery.end}
            onChange={changeQuery('end')}
            slotProps={{ htmlInput: { 'aria-label': '입출고 종료일' } }}
            sx={{ width: 170 }}
          />
          <TextField
            select
            size="small"
            margin="none"
            value={historyQuery.kind}
            onChange={(event) => management.changeKind(event.target.value)}
            slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '입출고 종류' } }}
            sx={{ width: 120 }}
          >
            <MenuItem value="">전체</MenuItem>
            {PRODUCT_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
          </TextField>
          <TextField
            size="small"
            margin="none"
            placeholder="품목명"
            value={historyQuery.product}
            onChange={changeQuery('product')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') management.searchHistory();
            }}
            slotProps={{ htmlInput: { 'aria-label': '입출고 품목명' } }}
            sx={{ width: 160 }}
          />
          <Button variant="contained" onClick={management.searchHistory}>조회</Button>
          <Button variant="outlined" onClick={() => void management.exportHistory()}>엑셀 다운로드</Button>
        </Box>
        {history && history.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>입출고 내역이 없습니다</Typography>}
        <ProductHistoryGrid rows={management.historyRows} columns={historyColumns} />
      </Card>

      <ScheduleEditDialog target="products" row={management.editing} onClose={() => setEditing(null)} onSaved={() => void management.loadSchedule()} />
      <ConfirmDialog
        open={ask != null}
        title="제품 재고조정"
        message={ask?.text ?? ''}
        confirmLabel="확인"
        onCancel={() => management.setAsk(null)}
        onConfirm={management.runAsk}
      />
      <ConfirmDialog
        open={management.alertText != null}
        title="제품 재고조정"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}
