import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import type { MaterialCheck } from '../../../co/master/item-master/types/itemMaster.types';

const CUSTOM = '__custom__';

// 송연 MaterialMatchModal: 등록된 원재료 목록과 정확히 같지 않은 이름마다
// 비슷한 이름(첫 번째가 기본 선택) 또는 직접 입력을 고른다. 확인하면 {입력한 이름: 확정한 이름} 을 돌려준다.
export function MaterialMatchDialog({
  unmatched,
  onConfirm,
  onClose,
}: {
  unmatched: MaterialCheck[];
  onConfirm: (resolved: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [choices, setChoices] = useState(() =>
    unmatched.map((item) => ({
      picked: item.suggestions.length ? item.suggestions[0] : CUSTOM,
      custom: item.suggestions.length ? '' : item.input,
    })),
  );
  const update = (index: number, patch: Partial<(typeof choices)[number]>) =>
    setChoices((previous) =>
      previous.map((choice, i) => (i === index ? { ...choice, ...patch } : choice)),
    );

  const confirm = () => {
    const resolved: Record<string, string> = {};
    unmatched.forEach((item, i) => {
      const { picked, custom } = choices[i];
      resolved[item.input] = picked === CUSTOM ? custom.trim() || item.input : picked;
    });
    onConfirm(resolved);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="material-match-title">
      <DialogTitle id="material-match-title">원재료명 확인이 필요해요</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          입력하신 이름이 등록된 원재료단가 목록과 정확히 일치하지 않아요. 맞는 걸 고르거나, 새 원재료라면 직접 이름을 확정해주세요.
        </Typography>
        {unmatched.map((item, i) => (
          <Box
            key={item.input}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, gap: 1.5, py: 1.5, borderTop: i ? '1px solid' : 'none', borderColor: 'divider' }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.input}</Typography>
              <Typography variant="caption" color="error">일치하는 원재료 없음</Typography>
            </Box>
            <Box>
              <RadioGroup
                aria-label={`${item.input} 확정 이름`}
                value={choices[i].picked}
                onChange={(event) => update(i, { picked: event.target.value })}
              >
                {item.suggestions.map((suggestion) => (
                  <FormControlLabel key={suggestion} value={suggestion} control={<Radio size="small" />} label={suggestion} />
                ))}
                <FormControlLabel value={CUSTOM} control={<Radio size="small" />} label="직접 입력 / 신규 원재료로 등록" />
              </RadioGroup>
              <TextField
                size="small"
                fullWidth
                placeholder="이름 직접 입력"
                value={choices[i].custom}
                onChange={(event) => update(i, { custom: event.target.value, picked: CUSTOM })}
                slotProps={{ htmlInput: { 'aria-label': `${item.input} 직접 입력` } }}
              />
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" onClick={confirm}>확인하고 등록</Button>
      </DialogActions>
    </Dialog>
  );
}
