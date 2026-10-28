import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { formatPrice } from '../../../../../shared/utils/numberFormat';
import { cancelMaterialPriceSchedule, fetchMaterialPriceLog, fetchMaterialPriceSchedule } from '../services/materialMaster.service';
import type { PriceLogRow, PriceScheduleRow } from '../types/materialMaster.types';

type LogGridRow = PriceLogRow & { id: string };

// 원재료 [이력] 창(2026-10-27): 예전 원재료 창의 변경로그 탭 + 예정된 단가변경(쓰기 권한이 있으면 취소)
export function MaterialHistoryDialog({
  code,
  name,
  canWrite,
  onClose,
}: {
  code: string;
  name: string;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<PriceLogRow[]>([]);
  const [schedule, setSchedule] = useState<PriceScheduleRow[]>([]);

  // 예약된 단가변경은 아직 적용 안 된 것만 보여준다
  const loadSchedule = useCallback(async () => {
    try {
      setSchedule((await fetchMaterialPriceSchedule(code)).filter((row) => !row.applied));
    } catch {
      // 송연도 알리지 않았다
    }
  }, [code]);

  useEffect(() => {
    fetchMaterialPriceLog(code).then(setLogs).catch(() => undefined);
    void loadSchedule();
  }, [code, loadSchedule]);

  const cancelSchedule = async (id: number) => {
    try {
      await cancelMaterialPriceSchedule(id);
    } catch {
      // 송연도 알리지 않았다
    }
    await loadSchedule();
  };

  const logRows = useMemo<LogGridRow[]>(() => logs.map((row, index) => ({ ...row, id: String(index) })), [logs]);
  const logColumns = useMemo<F1GridColumn<LogGridRow>[]>(
    () => [
      { field: 'id', type: 'rownumber', width: 56, headerName: 'No', align: 'center', pinned: 'left' },
      { field: 'changedAt', headerName: '변경일시', flex: 1.2, headerAlign: 'center', align: 'center', getValue: (row) => row.changedAt.replace('T', ' ') },
      { field: 'oldPrice', headerName: '이전 단가', flex: 1, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatPrice(row.oldPrice) },
      { field: 'newPrice', headerName: '변경 단가', flex: 1, headerAlign: 'center', align: 'right', renderCell: ({ row }) => formatPrice(row.newPrice) },
    ],
    [],
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="material-history-title">
      <DialogTitle id="material-history-title" sx={{ pr: 6 }}>
        단가 이력 — {name} ({code})
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {schedule.length > 0 && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>예정된 단가변경</Typography>
              {schedule.map((row) => (
                <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    <b>{row.effectiveDate}</b> 부터 <b>{formatPrice(row.newPrice)}원</b>으로 자동 적용 예정
                  </Typography>
                  {canWrite ? (
                    <Button size="small" color="error" onClick={() => void cancelSchedule(row.id)}>취소</Button>
                  ) : null}
                </Stack>
              ))}
            </Box>
          )}
          <Box sx={{ height: 320 }}>
            <F1Grid
              rows={logRows}
              columns={logColumns}
              rowKey="id"
              storageKey="cm-basic-info-material-history-log-grid"
              ariaLabel="F1-GRID 단가 변경로그"
              height="100%"
              maxHeight="100%"
              rowHeight={32}
              showCheckbox={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
