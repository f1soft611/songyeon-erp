import { Autocomplete, TextField } from '@mui/material';
import type { ClientOption } from '../../../co/master/item-master/types/itemMaster.types';

// 거래처 고르기(2026-10-23): 이름을 보여 주고 값은 거래처코드다. 사용 중 거래처 목록에서만 고른다(자유 입력 없음).
// 지금 저장된 코드가 목록에 없으면(사용안함이 된 거래처) 그 이름(currentName)으로 보여 주고 그대로 둔다.
// 제품등록 · 제품마스터 창 · 견적 창이 같이 쓴다.
// onUnmatchedInput(2026-10-27): 목록에 없는 글자를 치고 고르지 않으면 그 글자를 알려 준다(고르거나 지우면 '').
// 칸을 떠나면 글자는 원래 거래처로 돌아가므로, 저장 전에 이것으로 '고르지 않았다'를 막는다.
export function ClientSelect({
  options,
  value,
  onChange,
  currentName = '',
  label = '거래처명',
  disabled = false,
  shrinkLabel = false,
  onUnmatchedInput,
}: {
  options: ClientOption[];
  value: string;
  onChange: (clientCode: string) => void;
  currentName?: string;
  label?: string;
  disabled?: boolean;
  shrinkLabel?: boolean;
  onUnmatchedInput?: (typed: string) => void;
}) {
  const listed = options.find((option) => option.clientCode === value);
  const current: ClientOption | null = value
    ? listed ?? { clientCode: value, name: currentName ? `${currentName} (사용안함)` : value }
    : null;
  const choices = current && !listed ? [current, ...options] : options;

  return (
    <Autocomplete
      disabled={disabled}
      options={choices}
      value={current}
      onChange={(_, option) => {
        onUnmatchedInput?.('');
        onChange(option ? option.clientCode : '');
      }}
      onInputChange={(_, text, reason) => {
        if (!onUnmatchedInput) return;
        if (reason === 'clear') onUnmatchedInput('');
        if (reason !== 'input') return; // 고르기 · 칸 떠남으로 글자가 바뀐 것은 무시(그때 값은 onChange 로 온다)
        const typed = text.trim();
        onUnmatchedInput(!typed || typed === current?.name || choices.some((option) => option.name === typed) ? '' : typed);
      }}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, selected) => option.clientCode === selected.clientCode}
      getOptionKey={(option) => option.clientCode}
      noOptionsText="거래처마스터에 없는 거래처예요"
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          margin="none"
          label={label}
          placeholder="거래처마스터에서 고르세요"
          slotProps={shrinkLabel ? { ...params.slotProps, inputLabel: { shrink: true } } : params.slotProps}
        />
      )}
    />
  );
}
