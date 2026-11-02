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

// 생산가능확인 — 제품 추가 창(송연 Picker): 만들 제품(배합비가 있는 제품만)을 골라 '만들 것' 에 담는다.
// 2026-10-29 생산일자는 화면 검색줄로 옮겼다.
// 이미 담은 제품을 다시 담지 않아도 되게 빈 선택으로 연다. 수량은 '만들 것' 에서 적는다.
export function ProdCheckPickDialog({
  products,
  onPick,
  onClose,
}: {
  products: string[];
  onPick: (picked: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const pick = () => {
    if (picked.length === 0) {
      setMessage('만들 제품을 담아주세요');
      return;
    }
    onPick(picked);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="prod-check-pick-title">
      <DialogTitle id="prod-check-pick-title" sx={{ pr: 6 }}>
        생산가능확인 — 제품 추가
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
