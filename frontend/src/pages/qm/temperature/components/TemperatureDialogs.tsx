import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { cellInputProps } from '../../../../shared/utils/gridCellInput';
import { createSensors, fetchChannels, fetchSensors, updateSensor } from '../services/temperature.service';
import {
  availableChannels, channelLabel, channelValueText, toTemp, type TempChannel, type TempSensor,
} from '../utils/temperature';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type Message = { text: string; ok: boolean } | null;
const MessageLine = ({ message }: { message: Message }) =>
  message ? <Typography role="status" sx={{ fontSize: 12.5, color: message.ok ? 'success.main' : 'error.main' }}>{message.text}</Typography> : null;

// ===== 센서 수정 창 (송연 temp-sensor-modal) =====
// 그룹명은 이미 있는 그룹에서 고르거나 새로 적는다(비우면 미분류). 최저·최고온도를 벗어나면 카드가 빨갛게 된다.
export function SensorEditDialog({ sensorId, onClose, onSaved }: { sensorId: number | null; onClose: () => void; onSaved: () => void }) {
  const [sensor, setSensor] = useState<TempSensor | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [minTemp, setMinTemp] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const timer = useRef<number | null>(null);
  // 부모가 다시 그려질 때마다 닫기 함수가 새로 와도 센서를 다시 불러오지 않게 한다
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (sensorId == null) return;
    setMessage(null);
    setSensor(null);
    fetchSensors().then((list) => {
      const s = list.find((x) => x.id === sensorId);
      if (!s) { closeRef.current(); return; }
      setSensor(s);
      setName(s.name || '');
      setGroup(s.groupName || '');
      setMinTemp(s.minTemp != null ? String(s.minTemp) : '');
      setMaxTemp(s.maxTemp != null ? String(s.maxTemp) : '');
      setGroups(Array.from(new Set(list.map((x) => x.groupName).filter((g): g is string => Boolean(g)))));
    }).catch(() => closeRef.current());
  }, [sensorId]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const save = async () => {
    if (!sensor) return;
    if (!name.trim()) {
      setMessage({ text: '표시 이름은 필수예요', ok: false });
      return;
    }
    try {
      await updateSensor(sensor.id, { name: name.trim(), sensorId: sensor.sensorId, minTemp: toTemp(minTemp), maxTemp: toTemp(maxTemp), groupName: group.trim() || null });
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '저장에 실패했어요'), ok: false });
      return;
    }
    setMessage({ text: '저장되었습니다', ok: true });
    onSaved();
    timer.current = window.setTimeout(onClose, 500);
  };

  const numberField = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <TextField
      size="small" margin="none" type="number" label={label} placeholder={placeholder} value={value} onChange={(event) => set(event.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': label, step: 'any' } }} sx={{ flex: 1 }}
    />
  );

  return (
    <Dialog open={sensorId != null} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="temp-sensor-title">
      <DialogTitle id="temp-sensor-title" sx={{ fontSize: 15, fontWeight: 700 }}>센서 수정</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: '8px !important' }}>
        <TextField autoFocus size="small" margin="none" label="표시 이름" placeholder="예: 1번 냉동고" value={name}
          onChange={(event) => setName(event.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': '표시 이름' } }} />
        <Autocomplete
          freeSolo options={groups} inputValue={group} onInputChange={(_event, value) => setGroup(value)}
          renderInput={(params) => (
            <TextField {...params} size="small" margin="none" label="그룹명" placeholder="예: 1가공실 (비우면 미분류)"
              slotProps={{ ...params.slotProps, inputLabel: { shrink: true }, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '그룹명' } }} />
          )}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {numberField('최저온도(경고)', minTemp, setMinTemp, '예: -20')}
          {numberField('최고온도(경고)', maxTemp, setMaxTemp, '예: -15')}
        </Box>
        <MessageLine message={message} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={!sensor} onClick={() => void save()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

// ===== 센서 일괄등록 창 (송연 temp-bulk-register) =====
// 타파쿨로365에 등록된 전체 채널을 늘어놓고 체크해서 한 번에 등록한다. 이미 등록된 채널은 목록에서 빠진다.
type ChannelRow = TempChannel & { picked: boolean };

export function BulkRegisterDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<ChannelRow[] | null>(null);
  const [empty, setEmpty] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setEmpty('불러오는 중...');
    setMessage(null);
    Promise.all([fetchChannels(), fetchSensors()])
      .then(([channels, sensors]) => {
        const available = availableChannels(channels, sensors);
        setRows(available.map((c) => ({ ...c, picked: false })));
        setEmpty(available.length === 0 ? '이미 전부 등록되어 있어요' : '');
      })
      .catch((requestError) => { setRows([]); setEmpty(errorText(requestError, '채널 목록을 불러오지 못했어요')); });
  }, [open]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const toggle = (key: string) => setRows((cur) => (cur ?? []).map((r) => (r.channelKey === key ? { ...r, picked: !r.picked } : r)));
  const picked = (rows ?? []).filter((r) => r.picked);

  const save = async () => {
    if (picked.length === 0) {
      setMessage({ text: '등록할 채널을 선택해주세요', ok: false });
      return;
    }
    try {
      const created = await createSensors(picked.map((r) => ({ name: channelLabel(r), sensorId: r.channelKey })));
      setMessage({ text: `${created}개 등록되었습니다`, ok: true });
      onSaved();
      timer.current = window.setTimeout(onClose, 600);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '등록에 실패했어요'), ok: false });
    }
  };

  const columns = useMemo<F1GridColumn<ChannelRow>[]>(() => [
    { field: 'channelKey', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'picked', headerName: '선택', width: 56, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Checkbox {...cellInputProps} size="small" checked={row.picked} onChange={() => toggle(row.channelKey)} slotProps={{ input: { 'aria-label': `${channelLabel(row)} 선택` } }} sx={{ p: 0.25 }} />
      ),
    },
    { field: 'deviceName', headerName: '장치명', flex: 1, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.deviceName || '' },
    { field: 'chName', headerName: '채널명', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.chName || '' },
    { field: 'chValue', headerName: '현재값', width: 100, headerAlign: 'center', align: 'right', renderCell: ({ row }) => channelValueText(row) },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="temp-bulk-title">
      <DialogTitle id="temp-bulk-title" sx={{ fontSize: 15, fontWeight: 700 }}>센서 등록 (전체 채널)</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          타파쿨로365에 등록된 전체 채널이에요. 원하는 걸 체크하고 한번에 등록하세요. (이미 등록된 채널은 목록에서 빠져요)
        </Typography>
        {empty && <Typography variant="body2" color="text.secondary">{empty}</Typography>}
        <Box sx={{ height: 320 }}>
          <F1Grid rows={rows ?? []} columns={columns} rowKey="channelKey" storageKey="qm-temp-bulk-grid" ariaLabel="F1-GRID 타파쿨로365 채널"
            height="100%" maxHeight="100%" rowHeight={34} minRowHeight={34} maxRowHeight={320} columnLine showCheckbox={false} loading={rows == null}
            resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }} aria-label="선택한 채널 수">{picked.length}개 선택됨</Typography>
        <MessageLine message={message} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}>선택 항목 등록</Button>
      </DialogActions>
    </Dialog>
  );
}
