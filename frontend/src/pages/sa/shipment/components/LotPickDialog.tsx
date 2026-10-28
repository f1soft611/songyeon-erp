import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import { formatQty } from '../../../../shared/utils/numberFormat';
import {
  allocationStatus,
  lotText,
  mineByLot,
  plannedItems,
  type AllocationMode,
  type LotPick,
  type PendingOrder,
  type ProductLot,
} from '../utils/shipment';

// 표 한 줄: 보낼 수량(want)은 로트 여러 개로 나눠 적을 때만 고친다
type LotGridRow = {
  id: string;
  kind?: '생산확정' | '수주등록';
  label: string;
  planned: number;
  shipped: number;
  remaining: number;
  lotId: number | null;
  want: number | null;
  pick: LotPick;
};

const STATUS_COLOR = { ok: 'success.main', warn: 'warning.main', danger: 'error.main' } as const;

// 로트 선택 창(송연 SA0005LotPickModal)
// lots 가 null 이면 품목명이 등록된 제품과 일치하지 않은 것이다.
// alloc 이 있으면 '한 줄에 로트 여러 개' 모드: 로트마다 보낼 수량을 적고, 합계가 실출하량과 맞아야 저장된다.
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
  const producedRef = useRef<F1GridRef<LotGridRow>>(null);
  const plannedRef = useRef<F1GridRef<LotGridRow>>(null);
  const mine = useMemo(() => mineByLot(alloc?.existing || []), [alloc]);
  const initialWants = useMemo(
    () => Object.fromEntries((alloc?.existing || []).map((e) => [e.lotId, Number(e.qty) || 0])) as Record<number, number>,
    [alloc],
  );
  const [wants, setWants] = useState<Record<number, number>>(initialWants);

  const producedRows = useMemo<LotGridRow[]>(() => {
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
          clientName: lot.clientName, orderQty: lot.orderQty,
        },
      }));
  }, [lots, mine, initialWants]);

  const plannedRows = useMemo<LotGridRow[]>(
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
    for (const grid of [producedRef.current, plannedRef.current]) {
      for (const row of grid?.getActiveRows() ?? []) {
        if (row.lotId !== null) next[row.lotId] = Number(row.want) || 0;
      }
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

  const columns = (withKind: boolean): F1GridColumn<LotGridRow>[] => {
    const qty = (field: 'planned' | 'shipped' | 'remaining', headerName: string, bold = false): F1GridColumn<LotGridRow> => ({
      field,
      headerName,
      width: 96,
      headerAlign: 'center',
      align: 'right',
      renderCell: ({ row }) => formatQty(row[field]),
      ...(bold ? { getCellStyle: () => ({ fontWeight: 700 }) } : {}),
    });
    return [
      { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      ...(withKind
        ? [{
            field: 'kind', headerName: '구분', width: 90, headerAlign: 'center', align: 'center',
            renderCell: ({ row }) => <Chip size="small" variant="outlined" color={row.kind === '생산확정' ? 'success' : 'default'} label={row.kind} />,
          } as F1GridColumn<LotGridRow>]
        : []),
      { field: 'label', headerName: withKind ? '로트번호(예정일)' : '로트번호', flex: 1, width: 140, headerAlign: 'center', align: 'left' },
      qty('planned', withKind ? '계획수량' : '생산량'),
      qty('shipped', '출하량'),
      qty('remaining', '잔량', true),
      alloc
        ? {
            field: 'want', headerName: '보낼 수량', width: 110, headerAlign: 'center', align: 'right', type: 'number', decimalPlaces: 3, pinned: 'right',
            editable: (row) => row.lotId !== null,
            // 로트가 없는 수주등록 건은 나눠 적을 수 없어 선택만 한다(송연과 같다)
            renderCell: ({ row }) => (row.lotId === null
              ? <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => onPick(row.pick)}>선택</Button>
              : row.want == null || row.want === 0 ? '' : formatQty(Number(row.want))),
            getCellStyle: ({ row }) => (row.lotId !== null && (Number(row.want) || 0) > row.remaining + 0.001 ? { color: '#dc2626', fontWeight: 700 } : undefined),
          }
        : {
            field: 'pick', headerName: '선택', width: 80, headerAlign: 'center', align: 'center', pinned: 'right',
            renderCell: ({ row }) => <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, py: 0 }} onClick={() => onPick(row.pick)}>선택</Button>,
          },
    ];
  };

  const grid = (ref: typeof producedRef, rows: LotGridRow[], withKind: boolean, label: string, empty: string) => (
    <>
      {rows.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{empty}</Typography>}
      {/* 비어도 머리줄 있는 그리드를 둔다. 그때는 F1-Grid 빈 표시(max(행 높이×4, 120px))가 다 들어가는 높이를 준다 */}
      <Box sx={{ height: rows.length === 0 ? 36 + Math.max(34 * 4, 120) : Math.min(260, 40 + rows.length * 34) }}>
        <F1Grid
          ref={ref}
          rows={rows}
          columns={columns(withKind)}
          rowKey="id"
          storageKey={`sa-shipment-lot-${withKind ? 'planned' : 'produced'}-${alloc ? 'alloc' : 'pick'}`}
          ariaLabel={label}
          height="100%"
          maxHeight="100%"
          rowHeight={34}
          showCheckbox={false}
          resizableRows={false}
          allowAddRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false}
          allowDeleteRowInContextMenu={false}
          onChangesChange={collectWants}
        />
      </Box>
    </>
  );

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
        {grid(producedRef, producedRows, false, 'F1-GRID 생산입고 완료',
          lots === null ? '등록된 품목명과 일치하지 않아 로트를 찾을 수 없어요' : '잔량이 있는 로트가 없습니다')}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mt: 2.5, mb: 1 }}>생산예정 품목 (생산입고 전)</Typography>
        {grid(plannedRef, plannedRows, true, 'F1-GRID 생산예정 품목', lots === null ? '' : '생산입고를 기다리는 건이 없습니다')}
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
