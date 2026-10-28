import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { fetchMaterialLots } from '../services/stockStatus.service';
import { ssQty, type MaterialLot } from '../utils/stockStatus';

const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

// 품목을 누르면 보이는 입고 로트 칸 (송연 .ss-lots). 송연은 누른 줄 바로 밑에 펼쳤지만 표 안에 줄을 끼울 수 없어 표 아래에 붙인다.
// 로트마다 남은 양은 아직 못 낸다 — 생산에 투입할 때 어느 입고분을 썼는지 받지 않기 때문이다. 없는 숫자를 지어내지 않는다.
export function MaterialLotPanel({ code, name, date, onClose }: { code: string; name: string; date: string; onClose: () => void }) {
  const [lots, setLots] = useState<MaterialLot[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'done'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    setLots([]);
    fetchMaterialLots(code, date)
      .then((rows) => { if (alive) { setLots(rows); setState('done'); } })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [code, date]);

  const columns = useMemo<F1GridColumn<MaterialLot>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'barcode', headerName: '바코드(로트)', flex: 1.4, width: 220, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.barcode ? <Box component="span" sx={MONO}>{row.barcode}</Box> : <Box component="span" sx={{ color: 'text.disabled' }}>없음</Box>),
    },
    { field: 'receiveDate', headerName: '입고일', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.receiveDate || ''}</Box> },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'qty', headerName: '입고량', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ssQty(row.qty) },
    {
      field: 'returnedQty', headerName: '반품', width: 90, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => (row.returnedQty ? ssQty(row.returnedQty) : ''),
      getCellStyle: ({ row }) => (row.returnedQty ? { color: '#dc2626' } : undefined),
    },
    { field: 'netQty', headerName: '실입고', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => ssQty(row.netQty), getCellStyle: () => ({ fontWeight: 700 }) },
    { field: 'taxType', headerName: '남은 양', width: 110, headerAlign: 'center', align: 'center', renderCell: () => <Box component="span" sx={{ color: 'text.disabled' }}>스캔 연결 전</Box> },
  ], []);

  return (
    <Card aria-label="입고 로트 내역" sx={{ mt: 1, borderRadius: 1, border: '1px solid', borderColor: 'primary.main', borderLeftWidth: 3, boxShadow: 'none', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 13, flex: 1 }}><b>{name}</b> ({code}) 의 입고 로트 <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>· {date} 까지</Box></Typography>
        <Button size="small" onClick={onClose}>▾ 접기</Button>
      </Box>
      {state === 'loading' && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>불러오는 중...</Typography>}
      {state === 'error' && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>불러오지 못했어요</Typography>}
      {state === 'done' && lots.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>이 날짜까지 들어온 내역이 없습니다</Typography>}
      {state === 'done' && lots.length > 0 && (
        <>
          <Box sx={{ height: Math.min(240, 40 + lots.length * 34 + 4) }}>
            <F1Grid rows={lots} columns={columns} rowKey="id" storageKey="pu-stock-status-lot-grid" ariaLabel="F1-GRID 입고 로트"
              height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false}
              resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>&lsquo;남은 양&rsquo; 은 생산 투입 때 어느 로트를 썼는지 받기 시작하면 채워집니다.</Typography>
        </>
      )}
    </Card>
  );
}
