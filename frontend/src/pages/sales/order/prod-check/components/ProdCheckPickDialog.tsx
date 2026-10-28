import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// 생산가능확인 — 검색 창(송연 Picker): 생산일자와 만들 제품(배합비가 있는 제품만)을 골라 '만들 것' 에 담는다.
// 이미 담은 제품을 다시 담지 않아도 되게 빈 선택으로 연다. 수량은 '만들 것' 에서 적는다.
export function ProdCheckPickDialog({
  date,
  products,
  onPick,
  onClose,
}: {
  date: string;
  products: string[];
  onPick: (date: string, picked: string[]) => void;
  onClose: () => void;
}) {
  const [day, setDay] = useState(date);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const pick = () => {
    if (!day) {
      setMessage('생산일자를 골라주세요');
      return;
    }
    if (picked.length === 0) {
      setMessage('만들 제품을 담아주세요');
      return;
    }
    onPick(day, picked);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="prod-check-pick-title">
      <DialogTitle id="prod-check-pick-title" sx={{ pr: 6 }}>
        생산가능확인 — 검색
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          type="date"
          size="small"
          margin="none"
          label="생산일자"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 220 }}
        />
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={products}
          value={picked}
          onChange={(_, value) => setPicked(value)}
          noOptionsText="배합비가 있는 제품이 없어요"
          renderOption={(props, option, { selected }) => {
            const { key, ...rest } = props as typeof props & { key: string };
            return (
              <li key={key} {...rest}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                {option}
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              margin="none"
              label={`제품 (BOM 이 있는 제품만 나와요) — ${picked.length}개 담음`}
              placeholder="제품명으로 찾기"
              slotProps={{ ...params.slotProps, inputLabel: { shrink: true } }}
            />
          )}
        />
        <Typography variant="body2" color="text.secondary">
          담으면 아래 &apos;만들 것&apos; 에 줄로 내려갑니다. 수량은 거기서 적어주세요.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {message && <Typography role="status" variant="body2" color="error" sx={{ mr: 'auto' }}>{message}</Typography>}
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" onClick={pick}>담기</Button>
      </DialogActions>
    </Dialog>
  );
}
