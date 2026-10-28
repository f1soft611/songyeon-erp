import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  F1Grid,
  type F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MaterialRow, MaterialUsageRow } from '../types/materialMaster.types';
import { fetchMaterialRows, fetchMaterialUsage, replaceMaterial } from '../services/materialMaster.service';
import { findReplaceTarget } from '../utils/materialMaster';
import { ConfirmDialog } from '../../../../../shared/components/ConfirmDialog';
import { usageColumns } from './MaterialUsageDialog';

type Message = { text: string; error: boolean };
// 선택 칸이 다른 칸과 겹치지 않게 칸 이름을 하나 더 둔다
type ReplaceRow = MaterialUsageRow & { pick: string };

// 원재료 일괄적용 창(송연 CM0001Tab08ReplaceModal): 대체할 원재료를 고르고, 바꾸고 싶은 레시피(제품)만 체크해 교체한다.
export function MaterialReplaceDialog({
  code,
  name,
  onReplaced,
  onClose,
}: {
  code: string;
  name: string;
  onReplaced: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<MaterialUsageRow[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState<Message>({ text: '', error: false });
  const [confirming, setConfirming] = useState<Pick<MaterialRow, 'code' | 'name'> | null>(null);

  useEffect(() => {
    fetchMaterialUsage(code)
      .then((list) => {
        setRows(list);
        setChecked(list.map((row) => row.productCode)); // 송연처럼 모두 체크된 채로 연다
      })
      .catch(() => undefined);
  }, [code]);

  const toggle = (productCode: string, on: boolean) =>
    setChecked((previous) => (on ? [...previous, productCode] : previous.filter((c) => c !== productCode)));

  const gridRows = useMemo<ReplaceRow[]>(() => rows.map((row) => ({ ...row, pick: '' })), [rows]);
  const columns = useMemo<F1GridColumn<ReplaceRow>[]>(() => {
    const [rowNumber, ...rest] = usageColumns() as F1GridColumn<ReplaceRow>[];
    return [
      rowNumber,
      {
        field: 'pick',
        headerName: '선택',
        width: 60,
        headerAlign: 'center',
        align: 'center',
        getValue: () => '',
        renderCell: ({ row }) => (
          <Checkbox
            size="small"
            checked={checked.includes(row.productCode)}
            onChange={(event) => toggle(row.productCode, event.target.checked)}
            slotProps={{ input: { 'aria-label': `${row.productName || row.productCode} 선택` } }}
          />
        ),
      },
      ...rest,
    ];
  }, [checked]);

  const run = async () => {
    if (checked.length === 0) {
      setMessage({ text: '교체할 레시피를 하나 이상 체크해주세요', error: true });
      return;
    }
    // 화면에 걸린 검색어 때문에 목록에 없을 수 있으니, 찾을 때는 서버에 다시 묻는다
    const pool = await fetchMaterialRows(target.trim()).catch(() => [] as MaterialRow[]);
    // 2026-10-23 바꿔 넣을 원재료는 사용 중인 것만 찾는다(사용안함은 '없음'으로 본다)
    const found = findReplaceTarget(target, pool.filter((material) => material.useYn !== 'N'));
    if (found.error || !found.material) {
      setMessage({ text: found.error || '', error: true });
      return;
    }
    if (found.material.code === code) {
      setMessage({ text: '지금 보고 있는 원재료와 같아요. 남길 쪽의 코드를 적어주세요.', error: true });
      return;
    }
    setConfirming(found.material);
  };

  const execute = async () => {
    const picked = confirming;
    setConfirming(null);
    if (!picked) return;
    try {
      const affected = await replaceMaterial(code, picked.code, checked);
      setMessage({ text: `${affected}개 레시피에 반영됐어요`, error: false });
      await onReplaced();
    } catch (error) {
      setMessage({ text: error instanceof Error && error.message ? error.message : '교체에 실패했어요', error: true });
    }
  };

  const title = `원재료 일괄적용 — ${name} (${code})`;
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="material-replace-title">
      <DialogTitle id="material-replace-title" sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            대체할 원재료를 고르고, 아래에서 바꾸고 싶은 레시피(제품)만 체크해서 선택적으로 교체할 수 있어요.
            되돌릴 수 없으니 신중하게 진행해주세요.<br />이름이 똑같은 원재료가 둘 있을 때는 <b>원재료코드</b>로 적어주세요.
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="대체 원재료"
            placeholder="원재료명 또는 원재료코드"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mt: 1 }}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>사용 중인 레시피(제품) — 바꿀 항목만 체크</Typography>
            <Button size="small" variant="outlined" onClick={() => setChecked(rows.map((row) => row.productCode))}>전체선택</Button>
            <Button size="small" variant="outlined" onClick={() => setChecked([])}>전체해제</Button>
          </Stack>
          {rows.length === 0 && (
            <Typography role="status" variant="body2" color="text.secondary">이 원재료를 사용하는 제품이 없습니다</Typography>
          )}
          <Box sx={{ height: 280 }}>
            <F1Grid
              rows={gridRows}
              columns={columns}
              rowKey="id"
              storageKey="cm-basic-info-material-replace-grid"
              ariaLabel="F1-GRID 사용 중인 레시피"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              showCheckbox={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Button variant="contained" color="error" onClick={() => void run()}>선택한 레시피 일괄 교체 실행</Button>
            {message.text && (
              <Typography role="status" variant="body2" sx={{ color: message.error ? 'error.main' : 'primary.main' }}>
                {message.text}
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <ConfirmDialog
        open={confirming !== null}
        title="일괄 교체"
        message={confirming ? `선택한 레시피 ${checked.length}개를 "${confirming.name} (${confirming.code})"(으)로 교체할까요? 되돌릴 수 없어요.` : ''}
        confirmLabel="교체"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => void execute()}
      />
    </Dialog>
  );
}
