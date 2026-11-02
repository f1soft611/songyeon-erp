import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { formatQty } from '../../../../../shared/utils/numberFormat';
import type { AllocationMode, LotPick, PendingOrder, PlannedLotRow, ProducedLotRow, ProductLot } from '../types/shipment.types';
import { allocationStatus, lotText, mineByLot, plannedItems } from '../utils/shipment';
import { PlannedLotGrid, createPlannedLotColumns } from './PlannedLotGrid';
import { ProducedLotGrid, createProducedLotColumns } from './ProducedLotGrid';

const STATUS_COLOR = { ok: 'success.main', warn: 'warning.main', danger: 'error.main' } as const;

// 로트 선택 창(송연 SA0005LotPickModal)
// lots 가 null 이면 품목명이 등록된 제품과 일치하지 않은 것이다.
// alloc 이 있으면 '한 줄에 로트 여러 개' 모드: 로트마다 보낼 수량을 적고, 합계가 실출하량과 맞아야 저장된다.
// 2026-10-30 표를 둘로 나눴다: 생산입고 완료(ProducedLotGrid) · 생산예정 품목(PlannedLotGrid)
export function LotPickDialog({
  productName,
  lots,
  orders,
  alloc,
  onPick,
  onSaveAlloc,
  onClose,
  onAlert,
}: {
  productName: string;
  lots: ProductLot[] | null;
  orders: PendingOrder[];
  alloc: AllocationMode | null;
  onPick: (pick: LotPick) => void;
  onSaveAlloc: (allocations: { lotId: number; qty: number }[]) => Promise<void>;
  onClose: () => void;
  onAlert: (message: string) => void;
}) {
  const producedRef = useRef<F1GridRef<ProducedLotRow>>(null);
  const plannedRef = useRef<F1GridRef<PlannedLotRow>>(null);
  const mine = useMemo(() => mineByLot(alloc?.existing || []), [alloc]);
  const initialWants = useMemo(
    () => Object.fromEntries((alloc?.existing || []).map((e) => [e.lotId, Number(e.qty) || 0])) as Record<number, number>,
    [alloc],
  );
  const [wants, setWants] = useState<Record<number, number>>(initialWants);

  const producedRows = useMemo<ProducedLotRow[]>(() => {
    const avail = (lot: ProductLot) => lot.remainingQty + (mine[lot.lotId] || 0);
    return (lots || [])
      .filter((lot) => lot.status === 'produced' && avail(lot) > 0)
      .map((lot) => ({
        id: `lot-${lot.lotId}`,
        label: lotText(lot.lotNo, lot.lotDate),
        planned: lot.producedQty,
        shipped: lot.shippedQty - (mine[lot.lotId] || 0),
        remaining: avail(lot),
        lotId: lot.lotId,
        want: initialWants[lot.lotId] ?? null,
        pick: {
          lotId: lot.lotId, lotDate: lot.lotDate, lotNo: lot.lotNo, remainingQty: lot.remainingQty,
          clientCode: lot.clientCode, clientName: lot.clientName, orderQty: lot.orderQty,
        },
      }));
  }, [lots, mine, initialWants]);

  const plannedRows = useMemo<PlannedLotRow[]>(
    () =>
      (lots ? plannedItems(lots, orders, mine) : []).map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label || item.date || '-',
        planned: item.planned,
        shipped: item.shipped,
        remaining: item.remaining,
        lotId: item.pick.lotId,
        want: item.pick.lotId !== null ? initialWants[item.pick.lotId] ?? null : null,
        pick: item.pick,
      })),
    [lots, orders, mine, initialWants],
  );

  // 보낼 수량 칸이 있는 로트와 그 로트의 가능한 양
  const allocCells = useMemo(
    () =>
      alloc
        ? [...producedRows, ...plannedRows]
          .filter((row) => row.lotId !== null)
          .map((row) => ({ lotId: row.lotId as number, avail: row.remaining }))
        : [],
    [alloc, producedRows, plannedRows],
  );
  const status = alloc
    ? allocationStatus(allocCells.map((cell) => ({ want: wants[cell.lotId] || 0, avail: cell.avail })), alloc.targetQty)
    : null;

  // 표에서 고친 보낼 수량을 모은다
  const collectWants = () => {
    const next: Record<number, number> = {};
    const active: ProducedLotRow[] = [...(producedRef.current?.getActiveRows() ?? []), ...(plannedRef.current?.getActiveRows() ?? [])];
    for (const row of active) {
      if (row.lotId !== null) next[row.lotId] = Number(row.want) || 0;
    }
    setWants(next);
  };

  const saveAlloc = async () => {
    if (!alloc) return;
    const allocations = allocCells
      .map((cell) => ({ lotId: cell.lotId, qty: wants[cell.lotId] || 0 }))
      .filter((a) => a.qty > 0);
    const sum = allocations.reduce((total, a) => total + a.qty, 0);
    if (Math.abs(sum - alloc.targetQty) > 0.001) {
      onAlert(`배분 합계가 ${formatQty(sum)} 인데 실출하량은 ${formatQty(alloc.targetQty)} 이에요.\n합계를 실출하량과 맞춰주세요. 안 맞으면 재고가 어긋납니다.`);
      return;
    }
    await onSaveAlloc(allocations);
  };

  const producedColumns = useMemo(() => createProducedLotColumns({ alloc: Boolean(alloc), onPick }), [alloc, onPick]);
  const plannedColumns = useMemo(() => createPlannedLotColumns({ alloc: Boolean(alloc), onPick }), [alloc, onPick]);
  const emptyText = (text: string, rows: unknown[]) =>
    rows.length === 0 && text ? <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{text}</Typography> : null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="lot-pick-title">
      <DialogTitle id="lot-pick-title" sx={{ pr: 6 }}>
        로트 선택 — {productName}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          생산입고(실생산량)까지 끝난 건은 <b>생산입고 완료</b>, 아직 안 끝난 건은 <b>생산예정</b> 에서 고르시면 돼요.
          생산예정에서 고르면 출하량·거래처가 자동으로 채워지고, 계획수량 기준으로 잔량을 셉니다.
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>생산입고 완료</Typography>
        {emptyText(lots === null ? '등록된 품목명과 일치하지 않아 로트를 찾을 수 없어요' : '잔량이 있는 로트가 없습니다', producedRows)}
        <ProducedLotGrid rows={producedRows} columns={producedColumns} alloc={Boolean(alloc)} gridRef={producedRef} onChangesChange={collectWants} />
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mt: 2.5, mb: 1 }}>생산예정 품목 (생산입고 전)</Typography>
        {emptyText(lots === null ? '' : '생산입고를 기다리는 건이 없습니다', plannedRows)}
        <PlannedLotGrid rows={plannedRows} columns={plannedColumns} alloc={Boolean(alloc)} gridRef={plannedRef} onChangesChange={collectWants} />
        {alloc && lots !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            여러 로트에서 나눠 실었다면 각 로트의 <b>보낼 수량</b> 칸에 나눠 적어주세요.
            회수가 걸렸을 때 이 기록으로 어느 로트가 어디로 갔는지 되짚습니다.
          </Typography>
        )}
      </DialogContent>
      {alloc && lots !== null && status && (
        <DialogActions sx={{ px: 3, py: 1.5, gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ mr: 'auto' }}>
            배분 합계 <b>{formatQty(status.sum)}</b> / 실출하량 <b>{formatQty(alloc.targetQty)}</b>
            <Box component="span" role="status" sx={{ ml: 1.5, fontWeight: 700, color: STATUS_COLOR[status.tone] }}>{status.message}</Box>
          </Typography>
          <Button variant="contained" onClick={() => void saveAlloc()}>로트 배분 저장</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
